import React, { useState } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authAPI } from '../lib/api';
import { saveRefreshToken, saveToken, saveUser, User } from '../lib/auth';

export const WebLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      window.alert('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting login with:', email);
      
      // Add timeout to prevent hanging
      const loginPromise = authAPI.login(email, password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - check if backend is running')), 10000)
      );
      
      const response = await Promise.race([loginPromise, timeoutPromise]) as any;
      console.log('Login response:', response);
      
      if (response && response.token && response.user) {
        await saveToken(response.token);
        if (response.refreshToken) {
          await saveRefreshToken(response.refreshToken);
        }
        await saveUser(response.user as User);
        
        console.log('Login successful, navigating to:', response.user.role);
        
        if (response.user.role === 'TEACHER') {
          navigation.navigate('Teacher' as never);
        } else if (response.user.role === 'STUDENT') {
          navigation.navigate('Student' as never);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. ';
      if (error.message?.includes('timeout')) {
        errorMessage += 'Backend server may not be running. Please start the backend server.';
      } else if (error.message?.includes('fetch')) {
        errorMessage += 'Cannot connect to server. Please check if backend is running on port 3001.';
      } else {
        errorMessage += error.message || 'Please check your credentials.';
      }
      
      window.alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        border: '1px solid #334155'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center',
          marginBottom: '8px',
          margin: '0 0 8px 0'
        }}>
          FitPass Teacher
        </h1>
        <p style={{
          color: '#cbd5e1',
          textAlign: 'center',
          marginBottom: '32px',
          margin: '0 0 32px 0'
        }}>
          Sign in to manage your classes and sessions
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: 'white',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#334155',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: 'white',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '12px 44px 12px 12px',
                backgroundColor: '#334155',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '18px'
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            marginBottom: '24px'
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{
          backgroundColor: '#334155',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{
            color: '#cbd5e1',
            fontSize: '16px',
            marginBottom: '16px',
            margin: '0 0 16px 0',
            textAlign: 'center'
          }}>
            Demo Accounts:
          </h3>
          
          <div
            onClick={() => fillDemo('teacher1@fitpass.com', 'password123')}
            style={{
              backgroundColor: '#475569',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#64748b'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#475569'}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px' }}>👨‍🏫</span>
              <div>
                <div style={{ color: 'white', fontWeight: '500' }}>Teacher:</div>
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                  teacher1@fitpass.com / password123
                </div>
              </div>
            </div>
          </div>
          
          <div
            onClick={() => fillDemo('student1@fitpass.com', 'password123')}
            style={{
              backgroundColor: '#475569',
              borderRadius: '8px',
              padding: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#64748b'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#475569'}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px' }}>👨‍🎓</span>
              <div>
                <div style={{ color: 'white', fontWeight: '500' }}>Student:</div>
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                  student1@fitpass.com / password123
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};