import { Request, Response } from 'express';
import { NetworkUtils } from '../utils/network.util';
import { EmailService } from '../services/email.service';
import { prisma } from '../config/prisma';

const emailService = new EmailService();

// PayPal configuration — loaded from environment variables
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || 'https://api.sandbox.paypal.com';

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

// Get PayPal access token
const getPayPalAccessToken = async (): Promise<string> => {
  console.log('🔑 Getting PayPal access token...');
  console.log('🔑 Client ID:', PAYPAL_CLIENT_ID);
  console.log('🔑 Client Secret length:', PAYPAL_CLIENT_SECRET?.length || 0);
  console.log('🔑 PayPal Base URL:', PAYPAL_BASE_URL);
  
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  console.log('🔑 Auth header created, length:', auth.length);
  
  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: 'grant_type=client_credentials'
    });

    console.log('🔑 PayPal token response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ PayPal token error:', errorText);
      // Fix triệt để: kiểm tra nếu headers.entries là function thì mới gọi
      const headersAny = response.headers as any;
      if (headersAny && typeof headersAny.entries === 'function') {
        const entriesArr = Array.from(headersAny.entries());
        // Đảm bảo entriesArr là mảng các [string, string]
        const headersObj = Object.fromEntries(entriesArr as [string, string][]);
        console.error('❌ PayPal token response headers:', headersObj);
      } else {
        // Nếu không, log headers dạng object
        console.error('❌ PayPal token response headers (raw):', response.headers);
      }
      throw new Error(`Failed to get PayPal access token: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as PayPalTokenResponse;
    console.log('✅ PayPal access token obtained successfully');
    return data.access_token;
  } catch (networkError: any) {
    console.error('❌ Network error when getting PayPal token:', networkError);
    console.error('❌ Error type:', networkError.constructor.name);
    console.error('❌ Error message:', networkError.message);
    throw new Error(`Network error getting PayPal token: ${networkError.message}`);
  }
};

// Create PayPal order
export const createPayPalOrder = async (req: Request, res: Response) => {
  try {
    console.log('📦 Creating PayPal order request body:', req.body);
    console.log('👤 User ID from auth:', req.userId);
    
    const { packageId, userPackageId } = req.body;
    
    if (!packageId || !userPackageId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin packageId hoặc userPackageId'
      });
    }

    // Get package info
    const package_ = await prisma.package.findUnique({
      where: { id: packageId }
    });

    if (!package_) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy gói tập'
      });
    }

    // Verify user package belongs to current user
    const userPackage = await prisma.userPackage.findUnique({
      where: { id: userPackageId },
      include: { package: true }
    });

    if (!userPackage || userPackage.userId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập đơn hàng này'
      });
    }

    // Get PayPal access token
    console.log('🔑 Getting PayPal access token...');
    const accessToken = await getPayPalAccessToken();
    console.log('🔑 PayPal access token obtained successfully');

    // Convert VND to USD (approximate rate: 1 USD = 24,000 VND)
    const priceUSD = (package_.price / 24000).toFixed(2);
    console.log(`💰 Price conversion: ${package_.price} VND = ${priceUSD} USD`);

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: userPackageId,
        amount: {
          currency_code: 'USD',
          value: priceUSD
        },
        description: `FitPass - ${package_.name}`
      }],
      application_context: {
        return_url: `http://${NetworkUtils.getLocalIPAddress()}:8081/payment/success?userPackageId=${userPackageId}`,
        cancel_url: `http://${NetworkUtils.getLocalIPAddress()}:8081/payment/cancel`,
        brand_name: 'FitPass',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING'
      }
    };

    console.log('📤 Creating PayPal order with data:', JSON.stringify(orderData, null, 2));

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(orderData)
    });

    console.log('📥 PayPal response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ PayPal order creation failed:', errorData);
      console.error('❌ Response status:', response.status);
      throw new Error(`Failed to create PayPal order: ${response.status} - ${errorData}`);
    }

    const order = await response.json() as PayPalOrderResponse;
    console.log('✅ PayPal order created successfully:', order.id);

    // Save transaction record with proper logging
    console.log('💾 Creating transaction record for order:', order.id);
    const transaction = await prisma.transaction.create({
      data: {
        userPackageId,
        userId: req.userId || '',
        amount: package_.price,
        paymentMethod: 'PAYPAL',
        paymentId: order.id, // This is the key for lookup
        status: 'PENDING'
      }
    });
    console.log('✅ Transaction created with ID:', transaction.id, 'and paymentId:', transaction.paymentId);

    // Find approval URL
    const approvalUrl = order.links.find(link => link.rel === 'approve')?.href;

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        approvalUrl,
        amount: package_.price,
        currency: 'VND'
      }
    });
  } catch (error: any) {
    console.error('❌ Create PayPal order error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: `Lỗi server khi tạo đơn hàng PayPal: ${error.message || error}`
    });
  }
};

// Capture PayPal payment
export const capturePayPalPayment = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    console.log('💳 [CAPTURE] Starting PayPal payment capture for orderId:', orderId);
    console.log('💳 [CAPTURE] Request body:', JSON.stringify(req.body, null, 2));

    if (!orderId) {
      console.error('💳 [CAPTURE] Missing orderId in request');
      return res.status(400).json({
        success: false,
        message: 'Thiếu orderId'
      });
    }

    console.log('💳 [CAPTURE] Getting PayPal access token...');
    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();
    console.log('💳 [CAPTURE] Access token obtained:', accessToken ? 'SUCCESS' : 'FAILED');

    console.log('💳 [CAPTURE] Sending capture request to PayPal...');
    // Capture the payment
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('💳 [CAPTURE] PayPal response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('💳 [CAPTURE] PayPal capture failed:', errorData);
      console.error('💳 [CAPTURE] Response status:', response.status);
      throw new Error(`PayPal capture failed: ${response.status} - ${errorData}`);
    }

    const captureData = await response.json() as any;
    console.log('💳 [CAPTURE] PayPal capture data:', JSON.stringify(captureData, null, 2));
    
    const captureStatus = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.status;
    console.log('💳 [CAPTURE] Capture status:', captureStatus);

    if (captureStatus === 'COMPLETED') {
      console.log('💳 [CAPTURE] Payment completed, finding transaction by exact paymentId match...');
      
      // Simple exact match - no complex search strategies
      const transaction = await prisma.transaction.findFirst({
        where: { 
          paymentId: orderId,
          status: 'PENDING'
        },
        include: { userPackage: true }
      });

      console.log('💳 [CAPTURE] Transaction search result:', transaction ? {
        id: transaction.id,
        paymentId: transaction.paymentId,
        status: transaction.status
      } : 'NOT FOUND');

      if (transaction) {
        console.log('💳 [CAPTURE] Updating transaction status...');
        // Update transaction status
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            paymentId: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId
          }
        });

        // Activate user package if userPackageId exists
        if (transaction.userPackageId) {
          console.log('💳 [CAPTURE] Activating user package:', transaction.userPackageId);
          
          // Get the user package with its package details
          const userPackageWithPackage = await prisma.userPackage.findUnique({
            where: { id: transaction.userPackageId },
            include: { package: true }
          });

          if (userPackageWithPackage) {
            await prisma.userPackage.update({
              where: { id: transaction.userPackageId },
              data: { 
                status: 'ACTIVE',
                creditsLeft: userPackageWithPackage.package.credits // Set proper credits from package
              }
            });
            console.log('💳 [CAPTURE] User package activated with', userPackageWithPackage.package.credits, 'credits');

            // Send payment receipt email
            try {
              const user = await prisma.user.findUnique({
                where: { id: transaction.userId },
                select: { email: true, fullName: true, googleId: true }
              });
              if (user) {
                await emailService.sendPaymentReceiptEmail(
                  user.email,
                  user.fullName,
                  userPackageWithPackage.package.name,
                  userPackageWithPackage.package.price,
                  userPackageWithPackage.package.credits,
                  transaction.id,
                  !!user.googleId
                );
              }
            } catch (emailErr) {
              console.error('💳 [CAPTURE] Failed to send receipt email:', emailErr);
            }
          }
        }

        return res.json({
          success: true,
          message: 'Thanh toán thành công! Gói tập đã được kích hoạt.',
          data: {
            transactionId: transaction.id,
            orderId
          }
        });
      } else {
        console.error('💳 [CAPTURE] Transaction not found for orderId:', orderId);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giao dịch'
        });
      }
    } else {
      console.error('💳 [CAPTURE] Payment not completed, status:', captureStatus);
      return res.status(400).json({
        success: false,
        message: 'Thanh toán chưa hoàn tất'
      });
    }
  } catch (error) {
    console.error('💳 [CAPTURE] Critical error:', error);
    console.error('💳 [CAPTURE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xác nhận thanh toán',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
};

// Get payment status
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { userPackageId } = req.params;
    const userId = req.userId;

    const transaction = await prisma.transaction.findFirst({
      where: {
        userPackageId,
        userPackage: {
          userId
        }
      },
      include: {
        userPackage: {
          include: {
            package: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch'
      });
    }

    return res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy trạng thái thanh toán'
    });
  }
};

// Test PayPal connection (no auth needed)
export const testPayPalConnectionPublic = async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing PayPal connection...');
    const token = await getPayPalAccessToken();
    
    // Test network utilities
    const localIP = NetworkUtils.getLocalIPAddress();
    // Note: Deep link functionality removed for simplified development flow
    const requestIP = NetworkUtils.getRequestIP(req);
    
    res.json({
      success: true,
      message: 'PayPal connection successful',
      data: {
        hasToken: !!token,
        tokenLength: token.length,
        clientId: PAYPAL_CLIENT_ID,
        baseUrl: PAYPAL_BASE_URL,
        network: {
          localIP,
          requestIP
        }
      }
    });
  } catch (error: any) {
    console.error('PayPal connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'PayPal connection failed',
      error: error.message
    });
  }
};

// Handle PayPal return (success)
export const handlePayPalReturn = async (req: Request, res: Response) => {
  try {
    const { token, PayerID, userPackageId } = req.query;
    
    console.log('🎉 PayPal return handler called');
    console.log('📦 UserPackageId:', userPackageId);
    console.log('🔑 Token:', token);
    console.log('👤 PayerID:', PayerID);

    // Create redirect URL to mobile app deep link
    const localIP = NetworkUtils.getLocalIPAddress();
    const redirectURL = `exp://${localIP}:8081/--/payment/success?userPackageId=${userPackageId}&token=${token}&PayerID=${PayerID}`;
    
    // Send HTML page that redirects to mobile app
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Success</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 40px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
          }
          h1 { margin-bottom: 20px; }
          .success-icon {
            font-size: 60px;
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 20px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Payment Successful!</h1>
          <p>Your payment has been processed successfully.</p>
          <p>Redirecting to FitPass app...</p>
          <a href="${redirectURL}" class="btn">Open FitPass App</a>
        </div>
        <script>
          // Auto-redirect after 2 seconds
          setTimeout(() => {
            window.location.href = '${redirectURL}';
          }, 2000);
        </script>
      </body>
      </html>
    `);

  } catch (error: any) {
    console.error('❌ PayPal return handler error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Payment Error</title></head>
      <body style="text-align: center; padding: 40px; font-family: sans-serif;">
        <h1>Payment Error</h1>
        <p>There was an error processing your payment return.</p>
        <p>Please contact support if this issue persists.</p>
      </body>
      </html>
    `);
  }
};

// Handle PayPal cancel
export const handlePayPalCancel = async (req: Request, res: Response) => {
  try {
    console.log('❌ PayPal payment cancelled');
    
    // Create redirect URL to mobile app
    const localIP = NetworkUtils.getLocalIPAddress();
    const redirectURL = `exp://${localIP}:8081/--/student/packages?payment=cancelled`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Cancelled</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 40px 20px;
            background: linear-gradient(135deg, #ff7e79 0%, #ff6b6b 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
          }
          h1 { margin-bottom: 20px; }
          .cancel-icon {
            font-size: 60px;
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            background: #f44336;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 20px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="cancel-icon">❌</div>
          <h1>Payment Cancelled</h1>
          <p>Your payment has been cancelled.</p>
          <p>Returning to FitPass app...</p>
          <a href="${redirectURL}" class="btn">Return to App</a>
        </div>
        <script>
          setTimeout(() => {
            window.location.href = '${redirectURL}';
          }, 2000);
        </script>
      </body>
      </html>
    `);

  } catch (error: any) {
    console.error('❌ PayPal cancel handler error:', error);
    res.status(500).send('Payment cancellation error');
  }
};

// Check PayPal order status without capturing
export const checkPayPalOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    console.log('🔍 [STATUS] Checking PayPal order status for:', orderId);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu orderId'
      });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Get order details from PayPal
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('🔍 [STATUS] PayPal response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('🔍 [STATUS] PayPal status check failed:', errorData);
      return res.status(response.status).json({
        success: false,
        message: 'Không thể kiểm tra trạng thái đơn hàng'
      });
    }

    const orderData = await response.json() as any;
    console.log('🔍 [STATUS] PayPal order data:', JSON.stringify(orderData, null, 2));

    const orderStatus = orderData.status;
    console.log('🔍 [STATUS] Order status:', orderStatus);

    return res.json({
      success: true,
      data: {
        orderId,
        status: orderStatus,
        intent: orderData.intent,
        canCapture: orderStatus === 'APPROVED'
      }
    });

  } catch (error) {
    console.error('🔍 [STATUS] Check PayPal order status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra trạng thái đơn hàng'
    });
  }
};