const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

class NgrokManager {
    constructor() {
        this.ngrokProcess = null;
        this.backendProcess = null;
        this.currentUrl = null;
        this.isRunning = false;
        this.checkInterval = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔍';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async killExistingProcesses() {
        return new Promise((resolve) => {
            // Only kill ngrok, keep backend if running
            this.log('Checking existing processes...');
            exec('taskkill /F /IM ngrok.exe 2>nul', () => {
                setTimeout(resolve, 1000); // Wait 1 second
            });
        });
    }

    async isPortInUse(port) {
        return new Promise((resolve) => {
            const http = require('http');
            const request = http.request({
                hostname: 'localhost',
                port: port,
                method: 'GET',
                path: '/',
                timeout: 2000
            }, (res) => {
                resolve(true); // Port is in use
            });

            request.on('error', () => {
                resolve(false); // Port is free
            });

            request.on('timeout', () => {
                resolve(false); // No response = not in use
            });

            request.end();
        });
    }

    async startBackend() {
        // Check if backend is already running
        const isRunning = await this.isPortInUse(3001);
        if (isRunning) {
            this.log('Backend already running on port 3001 ✅', 'success');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            this.log('Starting backend server...');
            
            const backend = spawn('npm', ['run', 'dev'], {
                cwd: path.join(__dirname, 'fitpass-captone', 'backend'),
                shell: true,
                detached: true
            });

            let startupTimeout = setTimeout(() => {
                this.log('Backend startup timeout', 'error');
                reject(new Error('Backend startup timeout'));
            }, 30000);

            backend.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(output);
                
                if (output.includes('Server running on port')) {
                    clearTimeout(startupTimeout);
                    this.backendProcess = backend;
                    this.log('Backend server started successfully!', 'success');
                    resolve();
                }
            });

            backend.stderr.on('data', (data) => {
                const error = data.toString();
                if (error.includes('EADDRINUSE')) {
                    clearTimeout(startupTimeout);
                    this.log('Backend already running on port 3001', 'success');
                    resolve();
                } else {
                    console.error(error);
                }
            });
        });
    }

    async startNgrok() {
        return new Promise((resolve, reject) => {
            this.log('Starting ngrok tunnel...');
            
            const ngrok = spawn('ngrok', ['http', '3001'], {
                shell: true,
                detached: true
            });

            this.ngrokProcess = ngrok;
            
            // Wait for ngrok to start
            setTimeout(async () => {
                try {
                    const url = await this.getCurrentNgrokUrl();
                    if (url) {
                        this.currentUrl = url;
                        await this.updateEnvironment(url);
                        this.log(`Ngrok tunnel active: ${url}`, 'success');
                        resolve(url);
                    } else {
                        reject(new Error('Failed to get ngrok URL'));
                    }
                } catch (error) {
                    reject(error);
                }
            }, 10000);

            ngrok.on('error', (error) => {
                this.log(`Ngrok error: ${error.message}`, 'error');
                reject(error);
            });
        });
    }

    async getCurrentNgrokUrl() {
        return new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: 4040,
                path: '/api/tunnels',
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const tunnels = JSON.parse(data);
                        const httpsTunnel = tunnels.tunnels?.find(tunnel => 
                            tunnel.proto === 'https' && tunnel.config.addr.includes('3001')
                        );
                        resolve(httpsTunnel ? httpsTunnel.public_url : null);
                    } catch {
                        resolve(null);
                    }
                });
            });

            req.on('error', () => resolve(null));
            req.setTimeout(5000, () => {
                req.destroy();
                resolve(null);
            });
            req.end();
        });
    }

    async updateEnvironment(ngrokUrl) {
        // Update backend .env
        const envPath = path.join(__dirname, 'fitpass-captone', 'backend', '.env');
        
        try {
            let envContent = '';
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }

            const lines = envContent.split('\n')
                .filter(line => !line.startsWith('NGROK_URL=') && !line.startsWith('GOOGLE_CALLBACK_URL='));
            lines.push(`NGROK_URL=${ngrokUrl}`);
            lines.push(`GOOGLE_CALLBACK_URL=${ngrokUrl}/api/auth/google/callback`);
            
            fs.writeFileSync(envPath, lines.join('\n'));
            this.log(`Backend .env updated: NGROK_URL + GOOGLE_CALLBACK_URL`, 'success');
        } catch (error) {
            this.log(`Failed to update backend .env: ${error.message}`, 'error');
        }

        // Update mobile app .env.local
        const mobileEnvPath = path.join(__dirname, 'fitpass-app', '.env.local');
        try {
            const wsUrl = ngrokUrl.replace('https://', 'wss://');
            const appEnvContent = `# WebSocket URL for ngrok development\n# This file is created by auto-manager.js - do not edit manually\nEXPO_PUBLIC_WS_URL=${wsUrl}/ws\nEXPO_PUBLIC_API_URL=${ngrokUrl}/api\n`;
            
            fs.writeFileSync(mobileEnvPath, appEnvContent);
            this.log(`Mobile app .env.local updated with ngrok URL: ${wsUrl}`, 'success');
        } catch (error) {
            this.log(`Failed to update mobile .env.local: ${error.message}`, 'error');
        }
    }

    async checkConnection() {
        const url = await this.getCurrentNgrokUrl();
        
        if (!url) {
            this.log('Ngrok tunnel lost! Attempting restart...', 'error');
            await this.restart();
            return false;
        }

        if (url !== this.currentUrl) {
            this.log(`Ngrok URL changed: ${this.currentUrl} -> ${url}`);
            this.currentUrl = url;
            await this.updateEnvironment(url);
        }

        return true;
    }

    async restart() {
        if (this.retryCount >= this.maxRetries) {
            this.log(`Max retries reached (${this.maxRetries}). Manual intervention required.`, 'error');
            return;
        }

        this.retryCount++;
        this.log(`Restart attempt ${this.retryCount}/${this.maxRetries}...`);

        try {
            await this.killExistingProcesses();
            await this.startBackend();
            await this.startNgrok();
            this.retryCount = 0; // Reset on success
        } catch (error) {
            this.log(`Restart failed: ${error.message}`, 'error');
            setTimeout(() => this.restart(), 5000); // Retry in 5 seconds
        }
    }

    async start() {
        this.log('🚀 Starting FitPass Auto-Manager...');
        
        try {
            await this.killExistingProcesses();
            await this.startBackend();
            await this.startNgrok();
            
            this.isRunning = true;
            
            // Start monitoring every 30 seconds
            this.checkInterval = setInterval(() => {
                this.checkConnection();
            }, 30000);

            this.log('🎉 FitPass is ready! Auto-monitoring enabled.', 'success');
            this.log('💡 System will auto-restart ngrok when WiFi changes');
            this.log('📱 Password reset works on any device/network now');
            
        } catch (error) {
            this.log(`Startup failed: ${error.message}`, 'error');
            setTimeout(() => this.restart(), 5000);
        }
    }

    stop() {
        this.log('🛑 Stopping FitPass Auto-Manager...');
        this.isRunning = false;
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        if (this.ngrokProcess) {
            this.ngrokProcess.kill();
        }

        if (this.backendProcess) {
            this.backendProcess.kill();
        }

        this.log('✅ All services stopped');
    }
}

// Start the manager
const manager = new NgrokManager();

// Graceful shutdown
process.on('SIGINT', () => {
    manager.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    manager.stop();
    process.exit(0);
});

// Start the system
manager.start();