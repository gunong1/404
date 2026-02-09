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

import LegalPage from './components/LegalPage';
import { TERMS_CONTENT, PRIVACY_CONTENT } from './data/legalText';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

function App() {
  const [view, setView] = useState<'home' | 'detail' | 'checkout' | 'orderComplete' | 'mypage' | 'terms' | 'privacy'>('home');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderData, setOrderData] = useState<{ orderId: string; totalAmount: number; buyerName: string; shippingAddress: string } | null>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [savedAddress, setSavedAddress] = useState<{ zipcode: string; address: string; addressDetail: string }>(
    { zipcode: '', address: '', addressDetail: '' }
  );
  const [users, setUsers] = useState<any[]>(() => {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : [];
  }); // Simple user storage with persistence

  // OAuth Callback Handler & Simple Router
  useEffect(() => {
    const currentPath = window.location.pathname;
    const hash = window.location.hash;
    const search = window.location.search;

    if (currentPath === '/terms') {
      setView('terms');
      return;
    }
    if (currentPath === '/privacy-policy') {
      setView('privacy');
      return;
    }

    if (currentPath === '/oauth/callback') {
      // --- Naver Login Callback ---
      // Naver returns access_token in the hash fragment
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1)); // Remove '#'
        const accessToken = params.get('access_token');

        if (accessToken) {
          // Fetch Naver user profile using CORS proxy or just set logged in
          // Since Naver API requires server-side call due to CORS, we use a simple approach
          setIsLoggedIn(true);
          setUsername('네이버 사용자');
          console.log('Naver login success, access_token:', accessToken);

          // Try to get user info via Naver SDK
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
                const mobile = user.getMobile() || '';
                setUsername(name);
                setUserEmail(email);
                setUserPhone(mobile);
                console.log('Naver user profile:', user);
              }
            });
          } catch (e) {
            console.warn('Failed to get Naver user profile:', e);
          }
        }
        // Clean up URL
        window.history.replaceState({}, document.title, '/');
      }

      // --- Kakao Login Callback ---
      // Kakao returns authorization code in the query string
      if (search && search.includes('code=')) {
        const params = new URLSearchParams(search);
        const code = params.get('code');

        if (code) {
          console.log('Kakao auth code:', code);
          setIsLoggedIn(true);
          setUsername('카카오 사용자');

          // Fetch user info using the auth code
          const initAndFetch = async () => {
            try {
              // Wait for Kakao SDK
              if (window.Kakao && !window.Kakao.isInitialized()) {
                window.Kakao.init(import.meta.env.VITE_KAKAO_API_KEY);
              }

              // Exchange code for token via REST API
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
              console.log('Kakao token:', tokenData);

              if (tokenData.access_token) {
                // Fetch user info
                const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
                  headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const userData = await userRes.json();
                console.log('Kakao user:', userData);

                const account = userData.kakao_account || {};
                const profile = account.profile || {};
                setUsername(profile.nickname || '카카오 사용자');
                setUserEmail(account.email || '');

                // Handle Phone Number (Kakao returns +82 10-1234-5678)
                let mobile = account.phone_number || '';
                if (mobile.startsWith('+82 ')) {
                  mobile = '0' + mobile.slice(4).replace(/-/g, '').replace(/ /g, ''); // 01012345678
                  // Format as 010-1234-5678
                  if (mobile.length === 11) {
                    mobile = mobile.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                  }
                }
                setUserPhone(mobile);
              }
            } catch (err) {
              console.warn('Kakao user info fetch failed:', err);
            }
          };
          initAndFetch();
        }
        // Clean up URL
        window.history.replaceState({}, document.title, '/');
      }
    }
  }, []);

  // Persist users to localStorage
  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const addToCart = (item: CartItem) => {
    setCartItems(prev => {
      // Check if item already exists
      const existingToken = prev.find(i => i.id === item.id);
      if (existingToken) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
    alert(`장바구니에 ${item.name}이(가) ${item.quantity}개 추가되었습니다.`);
  };

  const buyNow = (item: CartItem) => {
    // For buy now, we can replace cart or just add to it. 
    // User request implies "Buy Now" leads to checkout page.
    // Let's add to cart and redirect for simplicity and persistence.
    setCartItems(prev => {
      const existingToken = prev.find(i => i.id === item.id);
      if (existingToken) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
    setView('checkout');
  };

  const cartTotalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleSignup = (userInfo: any) => {
    // Check if user already exists (ID or Email)
    if (users.some(u => u.username === userInfo.username)) {
      alert('이미 존재하는 아이디입니다.');
      return false;
    }
    // Check password strength again (Backend simulation)
    const pwRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*?_~]).{8,}$/;
    if (!pwRegex.test(userInfo.password)) {
      alert('비밀번호는 영문, 숫자, 특수문자 포함 8자 이상이어야 합니다.');
      return false;
    }

    setUsers([...users, userInfo]);
    // Use setTimeout to prevent blocking the UI render (INP optimization)
    setTimeout(() => {
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
    }, 100);
    console.log('Registered Users:', [...users, userInfo]); // For debugging
    return true;
  };

  const handleLogin = (id: string, pw: string) => {
    const user = users.find(u => u.username === id && u.password === pw);
    if (user) {
      setIsLoggedIn(true);
      setUsername(user.name || id);
      setUserEmail(user.email || '');
      setUserPhone(user.phone || '');
      alert(`${user.name || id}님 환영합니다!`);
      return true;
    } else {
      alert('아이디 또는 비밀번호가 일치하지 않습니다.');
      return false;
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
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
        onCartClick={() => setView('checkout')}
        onMyPageClick={() => setView('mypage')}
        onHomeClick={() => setView('home')}
      />
      <Hero />
      {view === 'home' && (
        <BentoGrid onProductClick={() => setView('detail')} />
      )}
      {view === 'detail' && (
        <ProductDetail
          onBack={() => setView('home')}
          isLoggedIn={isLoggedIn}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onAddToCart={(qty) => addToCart({
            id: 'bodywash-01',
            name: 'Scent Not Found 바디워시',
            price: 18000,
            quantity: qty,
            image: '/bottle_404.jpg'
          })}
          onBuyNow={(qty) => buyNow({
            id: 'bodywash-01',
            name: 'Scent Not Found 바디워시',
            price: 18000,
            quantity: qty,
            image: '/bottle_404.jpg'
          })}
        />
      )}
      {view === 'checkout' && (
        <Checkout
          items={cartItems}
          totalAmount={cartTotalPrice}
          onBack={() => setView('home')}
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
            setView('orderComplete');
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
            setView('home');
          }}
        />
      )}
      {view === 'mypage' && (
        <MyPage
          onBack={() => setView('home')}
          username={username}
          savedAddress={savedAddress}
          onAddressChange={(addr) => setSavedAddress(addr)}
        />
      )}
      {view === 'terms' && (
        <LegalPage
          title="이용약관"
          content={TERMS_CONTENT}
          onHomeClick={() => {
            setView('home');
            window.history.pushState({}, '', '/');
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
            setView('home');
            window.history.pushState({}, '', '/');
          }}
          isLoggedIn={isLoggedIn}
          username={username}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onLogoutClick={handleLogout}
        />
      )}
      <Footer />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onCheckDuplicate={(id) => !users.some(u => u.username === id)}
      />
    </div>
  );
}

export default App;
