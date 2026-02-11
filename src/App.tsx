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
  const updateSession = async (name: string, email: string, phone: string, role: string = 'user') => {
    setIsLoggedIn(true);
    setUsername(name);
    setUserEmail(email);
    setUserPhone(phone);
    setUserRole(role);
    localStorage.setItem('session_user', JSON.stringify({ name, email, phone, role }));

    // Load saved address from DB
    if (email) {
      const { data } = await supabase
        .from('users')
        .select('address, detail_address, zipcode')
        .eq('email', email)
        .maybeSingle();
      if (data && data.address) {
        const addr = {
          zipcode: data.zipcode || '',
          address: data.address || '',
          addressDetail: data.detail_address || '',
        };
        setSavedAddress(addr);
        localStorage.setItem('saved_address', JSON.stringify(addr));
      }
    }
  };

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
    if (currentPath === '/admin/orders') {
      setView('admin');
      return;
    }

    if (currentPath === '/oauth/callback') {
      // --- Naver Login Callback ---
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
                const mobile = user.getMobile() || '';
                console.log('Naver user profile - name:', name, 'email:', email, 'mobile:', mobile);
                updateSession(name, email, mobile);
              }
            });
          } catch (e) {
            console.warn('Failed to get Naver user profile:', e);
            // Fallback if SDK fails
            updateSession('네이버 사용자', '', '');
          }
        }
        window.history.replaceState({}, document.title, '/');
      }

      // --- Kakao Login Callback ---
      if (search && search.includes('code=')) {
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
                const profile = account.profile || {};
                const name = profile.nickname || '카카오 사용자';
                const email = account.email || '';

                let mobile = account.phone_number || '';
                console.log('Kakao raw phone_number:', account.phone_number);
                if (mobile && mobile.startsWith('+82 ')) {
                  mobile = '0' + mobile.slice(4).replace(/-/g, '').replace(/ /g, '');
                  if (mobile.length === 11) {
                    mobile = mobile.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                  }
                }
                console.log('Kakao parsed mobile:', mobile);
                updateSession(name, email, mobile);
              }
            } catch (err) {
              console.warn('Kakao user info fetch failed:', err);
            }
          };
          initAndFetch();
        }
        window.history.replaceState({}, document.title, '/');
      }
    }
  }, []);



  // Scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const addToCart = (item: CartItem) => {
    setCartItems(prev => {
      const existingToken = prev.find(i => i.id === item.id);
      if (existingToken) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
    alert(`장바구니에 ${item.name}이(가) ${item.quantity}개 추가되었습니다.`);
  };

  const buyNow = (item: CartItem) => {
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

    setTimeout(() => {
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
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
    setView('home');
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
        transparent={view === 'home'}
      />
      {view === 'home' && (
        <>
          <Hero />
          <BentoGrid
            onProductClick={() => setView('detail')}
            onQuickBuy={() => buyNow({
              id: 'bodywash-01',
              name: 'Scent Not Found 바디워시',
              price: 18000,
              quantity: 1,
              image: '/bottle_404.jpg'
            })}
          />
        </>
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
            setView('home');
          }}
        />
      )}
      {view === 'mypage' && (
        <MyPage
          onBack={() => setView('home')}
          username={username}
          userEmail={userEmail}
          savedAddress={savedAddress}
          onAddressChange={(addr) => { setSavedAddress(addr); localStorage.setItem('saved_address', JSON.stringify(addr)); }}
        />
      )}
      {view === 'admin' && (
        <AdminOrders
          onBack={() => {
            setView('home');
            window.history.pushState({}, '', '/');
          }}
          userRole={userRole}
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
