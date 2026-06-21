import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import BentoGrid from './components/BentoGrid';
import ProductDetail from './components/ProductDetail';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import Checkout from './components/Checkout';
import OrderComplete from './components/OrderComplete';
import MyPage from './components/MyPage';
import AdminOrders from './components/AdminOrders';
import FloatingChat from './components/FloatingChat';

import LegalPage from './components/LegalPage';
import { TERMS_CONTENT, PRIVACY_CONTENT } from './data/legalText';
import { supabase } from './lib/supabase';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

function App() {
  const [view, setView] = useState<'home' | 'detail' | 'checkout' | 'orderComplete' | 'mypage' | 'terms' | 'privacy' | 'admin'>('home');

  // History API 연동을 위한 네비게이션 핸들러
  const handleSetView = (newView: typeof view, push = true) => {
    setView(newView);
    if (push) {
      const path = newView === 'home' ? '/' :
        newView === 'detail' ? '/detail' :
        newView === 'admin' ? '/admin/orders' :
          newView === 'terms' ? '/terms' :
            newView === 'privacy' ? '/privacy-policy' : '/';
      window.history.pushState({ view: newView }, '', path);
    }
  };

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderData, setOrderData] = useState<{ orderId: string; totalAmount: number; buyerName: string; shippingAddress: string } | null>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Initialize state from localStorage if available
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('session_user');
  });
  const [username, setUsername] = useState(() => {
    const session = localStorage.getItem('session_user');
    return session ? JSON.parse(session).name : '';
  });
  const [userEmail, setUserEmail] = useState(() => {
    const session = localStorage.getItem('session_user');
    return session ? JSON.parse(session).email : '';
  });
  const [userPhone, setUserPhone] = useState(() => {
    const session = localStorage.getItem('session_user');
    return session ? JSON.parse(session).phone : '';
  });
  const [userRole, setUserRole] = useState(() => {
    const session = localStorage.getItem('session_user');
    return session ? JSON.parse(session).role || 'user' : 'user';
  });

  const [savedAddress, setSavedAddress] = useState<{ zipcode: string; address: string; addressDetail: string }>(() => {
    const saved = localStorage.getItem('saved_address');
    return saved ? JSON.parse(saved) : { zipcode: '', address: '', addressDetail: '' };
  });


  // Helper to update session
  // Issue welcome coupon (3,000원) - checks for duplicates
  const issueWelcomeCoupon = async (email: string) => {
    if (!email) return;
    try {
      // Check if welcome coupon already issued
      const { data: existing } = await supabase
        .from('user_coupons')
        .select('id')
        .eq('user_email', email)
        .eq('coupon_name', '회원가입 환영 쿠폰')
        .maybeSingle();
      if (existing) return; // Already issued

      await supabase.from('user_coupons').insert({
        user_email: email,
        coupon_name: '회원가입 환영 쿠폰',
        discount_amount: 3000,
        min_order_amount: 0,
        is_used: false,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });
      console.log('[Coupon] Welcome coupon issued for', email);
    } catch (err) {
      console.error('[Coupon] Failed to issue:', err);
    }
  };

  const updateSession = async (name: string, email: string, phone: string, role: string = 'user') => {
    setIsLoggedIn(true);
    setUsername(name);
    setUserEmail(email);
    setUserPhone(phone);

    // Load saved address and role from DB
    let resolvedRole = role;
    if (email) {
      const { data } = await supabase
        .from('users')
        .select('address, detail_address, zipcode, role')
        .eq('email', email)
        .maybeSingle();
      if (data) {
        // Use DB role if available (for OAuth users who have admin role in DB)
        if (data.role) {
          resolvedRole = data.role;
        }
        if (data.address) {
          const addr = {
            zipcode: data.zipcode || '',
            address: data.address || '',
            addressDetail: data.detail_address || '',
          };
          setSavedAddress(addr);
          localStorage.setItem('saved_address', JSON.stringify(addr));
        }
      }
      // Issue welcome coupon for OAuth users on first login
      issueWelcomeCoupon(email);
    }
    setUserRole(resolvedRole);
    localStorage.setItem('session_user', JSON.stringify({ name, email, phone, role: resolvedRole }));
  };

  // 초기 로드 및 뒤로가기/OAuth/결제 리다이렉트 처리
  useEffect(() => {
    const currentPath = window.location.pathname;
    const hash = window.location.hash;
    const search = window.location.search;

    // 1. 단순 경로 처리
    if (currentPath === '/terms') {
      handleSetView('terms', false);
    } else if (currentPath === '/privacy-policy') {
      handleSetView('privacy', false);
    } else if (currentPath === '/admin/orders') {
      handleSetView('admin', false);
    } else if (currentPath === '/detail') {
      handleSetView('detail', false);
    }

    // 2. 초기 상태 replaceState (뒤로가기 시 기준점)
    if (!window.history.state) {
      window.history.replaceState({ view: 'home' }, '', '/');
    }

    // 3. 뒤로가기 감지 리스너
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        setView('home');
      }
    };
    window.addEventListener('popstate', handlePopState);

    // 4. 모바일 결제 리다이렉트 처리
    const pendingRaw = sessionStorage.getItem('pending_order');
    if (pendingRaw) {
      const params = new URLSearchParams(search);
      const redirectPaymentId = params.get('paymentId');
      const redirectCode = params.get('code');

      if (redirectPaymentId || redirectCode !== null) {
        const pending = JSON.parse(pendingRaw);
        sessionStorage.removeItem('pending_order');
        window.history.replaceState({ view: 'home' }, document.title, '/');

        if (redirectCode && redirectCode !== 'PAYMENT_PAID') {
          const errorMsg = params.get('message') || '결제가 취소되었습니다.';
          alert(errorMsg);
        } else {
          const processRedirectPayment = async () => {
            try {
              await supabase.from('orders').insert([{
                merchant_uid: pending.paymentId,
                amount: pending.amount,
                buyer_name: pending.buyerName,
                buyer_email: pending.buyerEmail,
                buyer_tel: pending.buyerTel,
                buyer_addr: pending.shippingAddress,
                buyer_postcode: pending.buyerPostcode,
                order_items: pending.items,
                shipping_memo: pending.shippingMemo,
                points_used: pending.pointsUsed || 0,
                coupon_id: pending.couponId || null,
                status: 'paid',
              }]);

              // 재고 차감
              if (pending.items && Array.isArray(pending.items)) {
                const totalQty = pending.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
                await supabase.rpc('deduct_stock', { product_id: 'bodywash-01', qty: totalQty });
              }

              // 포인트/쿠폰/주소 처리 생략(기존 동일 로직)
              setOrderData({
                orderId: pending.paymentId,
                totalAmount: pending.amount,
                buyerName: pending.buyerName,
                shippingAddress: pending.shippingAddress,
              });
              setCartItems([]);
              handleSetView('orderComplete', false); // 리다이렉트 후에는 히스토리 추가 안함
            } catch (err) {
              console.error('Redirect payment error:', err);
            }
          };
          processRedirectPayment();
        }
      }
    }

    // 5. OAuth 콜백 처리
    if (currentPath === '/oauth/callback') {
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        if (accessToken) {
          try {
            const naverLogin = new (window as any).naver.LoginWithNaverId({
              clientId: import.meta.env.VITE_NAVER_CLIENT_ID,
              callbackUrl: import.meta.env.VITE_NAVER_CALLBACK_URL,
              isPopup: false,
              loginButton: { color: 'green', type: 3, height: 60 },
            });
            naverLogin.init();
            naverLogin.getLoginStatus((status: boolean) => {
              if (status) {
                const user = naverLogin.user;
                const name = user.getName() || user.getNickName() || '네이버 사용자';
                const email = user.getEmail() || '';
                const mobile = (user.getMobile() || '').replace(/-/g, '');
                updateSession(name, email, mobile);
              }
            });
          } catch (e) {
            console.warn('Naver SDK error:', e);
          }
        }
        window.history.replaceState({ view: 'home' }, document.title, '/');
      } else if (search && search.includes('code=')) {
        const params = new URLSearchParams(search);
        const code = params.get('code');
        if (code) {
          const initAndFetch = async () => {
            try {
              if (window.Kakao && !window.Kakao.isInitialized()) {
                window.Kakao.init(import.meta.env.VITE_KAKAO_API_KEY);
              }
              const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  grant_type: 'authorization_code',
                  client_id: import.meta.env.VITE_KAKAO_API_KEY,
                  redirect_uri: window.location.origin + '/oauth/callback',
                  code: code,
                }),
              });
              const tokenData = await tokenRes.json();
              if (tokenData.access_token) {
                const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
                  headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const userData = await userRes.json();
                const account = userData.kakao_account || {};
                const name = account.profile?.nickname || '카카오 사용자';
                const email = account.email || '';
                let mobile = account.phone_number || '';
                if (mobile && mobile.startsWith('+82 ')) {
                  mobile = '0' + mobile.slice(4).replace(/-/g, '').replace(/ /g, '');
                }
                updateSession(name, email, mobile);
              }
            } catch (err) {
              console.warn('Kakao fetch error:', err);
            }
          };
          initAndFetch();
        }
        window.history.replaceState({ view: 'home' }, document.title, '/');
      }
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const addToCart = (item: CartItem) => {
    if (item) { /* no-op: resolve unused parameter error */ }
    alert('현재는 홈페이지 오픈 준비 기간으로, 상품 주문 및 장바구니 기능을 이용하실 수 없습니다.');
    return;
  };

  const buyNow = (item: CartItem) => {
    if (item) { /* no-op: resolve unused parameter error */ }
    alert('현재는 홈페이지 오픈 준비 기간으로, 상품 주문 및 장바구니 기능을 이용하실 수 없습니다.');
    return;
  };

  const cartTotalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleSignup = async (userInfo: any) => {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', userInfo.username)
      .maybeSingle();

    if (existingUser) {
      alert('이미 존재하는 아이디입니다.');
      return false;
    }

    // Check password strength locally
    const pwRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*?_~]).{8,}$/;
    if (!pwRegex.test(userInfo.password)) {
      alert('비밀번호는 영문, 숫자, 특수문자 포함 8자 이상이어야 합니다.');
      return false;
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('email')
      .eq('email', userInfo.email)
      .maybeSingle();

    if (existingEmail) {
      alert('이미 사용 중인 이메일입니다.');
      return false;
    }

    // Explicitly map fields to match DB column names (PostgreSQL lowercases unquoted identifiers)
    const { error } = await supabase
      .from('users')
      .insert([{
        username: userInfo.username,
        password: userInfo.password,
        name: userInfo.name,
        email: userInfo.email,
        phone: userInfo.phone,
        marketingconsent: userInfo.marketingConsent || false,
      }]);

    if (error) {
      console.error('Signup error:', error);
      alert('회원가입 중 오류가 발생했습니다.');
      return false;
    }

    // Issue welcome coupon
    if (userInfo.email) {
      await issueWelcomeCoupon(userInfo.email);
    }

    setTimeout(() => {
      alert('회원가입이 완료되었습니다! 🎉 3,000원 환영 쿠폰이 발급되었습니다. 로그인해주세요.');
    }, 100);
    return true;
  };

  const handleLogin = async (id: string, pw: string) => {
    // Explicitly select columns including role
    const { data, error } = await supabase
      .from('users')
      .select('username, name, email, phone, role')
      .eq('username', id)
      .eq('password', pw)
      .single();

    if (error || !data) {
      alert('아이디 또는 비밀번호가 일치하지 않습니다.');
      return false;
    }

    const user = data;
    updateSession(user.name || id, user.email || '', user.phone || '', user.role || 'user');
    alert(`${user.name || id}님 환영합니다!`);
    return true;
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setUserEmail('');
    setUserPhone('');
    setUserRole('user');
    localStorage.removeItem('session_user');
    localStorage.removeItem('saved_address');
    setSavedAddress({ zipcode: '', address: '', addressDetail: '' });
    handleSetView('home');
    alert('로그아웃 되었습니다.');
  }

  return (
    <div className="App">
      <Header
        cartCount={cartTotalCount}
        isLoggedIn={isLoggedIn}
        username={username}
        onLoginClick={() => setIsLoginModalOpen(true)}
        onLogoutClick={handleLogout}
        onCartClick={() => {
          alert('현재는 홈페이지 오픈 준비 기간으로, 상품 주문 및 장바구니 기능을 이용하실 수 없습니다.');
        }}
        onMyPageClick={() => handleSetView('mypage')}
        onHomeClick={() => handleSetView('home')}
        transparent={view === 'home'}
      />
      {view === 'home' && (
        <>
          <Hero />
          <BentoGrid
            onProductClick={() => handleSetView('detail')}
            onQuickBuy={() => buyNow({
              id: 'bodywash-01',
              name: '404 Not Found 바디워시',
              price: 29800,
              quantity: 1,
              image: '/bottle_404.jpg'
            })}
          />
        </>
      )}
      {view === 'detail' && (
        <ProductDetail
          onBack={() => handleSetView('home')}
          isLoggedIn={isLoggedIn}
          onLoginClick={() => setIsLoginModalOpen(true)}
          userEmail={userEmail}
          onAddToCart={(qty) => addToCart({
            id: 'bodywash-01',
            name: '404 Not Found 바디워시',
            price: 29800,
            quantity: qty,
            image: '/bottle_404.jpg'
          })}
          onBuyNow={(qty) => buyNow({
            id: 'bodywash-01',
            name: '404 Not Found 바디워시',
            price: 29800,
            quantity: qty,
            image: '/bottle_404.jpg'
          })}
        />
      )}
      {view === 'checkout' && (
        <Checkout
          items={cartItems}
          totalAmount={cartTotalPrice}
          onBack={() => handleSetView('home')}
          username={username}
          userEmail={userEmail}
          userPhone={userPhone}
          savedAddress={savedAddress}
          onUpdateQuantity={(itemId, newQty) => {
            setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
          }}
          onRemoveItem={(itemId) => {
            setCartItems(prev => prev.filter(i => i.id !== itemId));
          }}
          onOrderComplete={(orderId, buyerName, shippingAddress) => {
            setOrderData({ orderId, totalAmount: cartTotalPrice, buyerName, shippingAddress });
            setCartItems([]);
            handleSetView('orderComplete');
            // Reload saved address from DB
            if (userEmail) {
              supabase
                .from('users')
                .select('address, detail_address, zipcode')
                .eq('email', userEmail)
                .single()
                .then(({ data }) => {
                  if (data && data.address) {
                    const addr = {
                      zipcode: data.zipcode || '',
                      address: data.address || '',
                      addressDetail: data.detail_address || '',
                    };
                    setSavedAddress(addr);
                    localStorage.setItem('saved_address', JSON.stringify(addr));
                  }
                });
            }
          }}
        />
      )}
      {view === 'orderComplete' && orderData && (
        <OrderComplete
          orderId={orderData.orderId}
          totalAmount={orderData.totalAmount}
          buyerName={orderData.buyerName}
          shippingAddress={orderData.shippingAddress}
          onGoHome={() => {
            setOrderData(null);
            handleSetView('home');
          }}
        />
      )}
      {view === 'mypage' && (
        <MyPage
          onBack={() => handleSetView('home')}
          username={username}
          userEmail={userEmail}
          userPhone={userPhone}
          savedAddress={savedAddress}
          onAddressChange={(addr) => { setSavedAddress(addr); localStorage.setItem('saved_address', JSON.stringify(addr)); }}
          onPhoneChange={(phone) => {
            setUserPhone(phone);
            const session = localStorage.getItem('session_user');
            if (session) {
              const parsed = JSON.parse(session);
              parsed.phone = phone;
              localStorage.setItem('session_user', JSON.stringify(parsed));
            }
          }}
        />
      )}
      {view === 'admin' && (
        <AdminOrders
          onBack={() => {
            handleSetView('home');
          }}
          userRole={userRole}
        />
      )}
      {view === 'terms' && (
        <LegalPage
          title="이용약관"
          content={TERMS_CONTENT}
          onHomeClick={() => {
            handleSetView('home');
          }}
          isLoggedIn={isLoggedIn}
          username={username}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onLogoutClick={handleLogout}
        />
      )}
      {view === 'privacy' && (
        <LegalPage
          title="개인정보처리방침"
          content={PRIVACY_CONTENT}
          onHomeClick={() => {
            handleSetView('home');
          }}
          isLoggedIn={isLoggedIn}
          username={username}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onLogoutClick={handleLogout}
        />
      )}
      <Footer />
      <FloatingChat />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onCheckDuplicate={async (id) => {
          const { data } = await supabase
            .from('users')
            .select('username')
            .eq('username', id)
            .maybeSingle();
          // If data exists, it's a duplicate (return false for available).
          // Wait, logic: 'onCheckDuplicate' return true if available?
          // LoginModal: if (isAvailable) ... setIsIdChecked(true)
          // So return true if NO user found.
          return !data;
        }}
      />
    </div>
  );
}

export default App;
