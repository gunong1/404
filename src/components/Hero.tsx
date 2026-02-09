import React from 'react';
import './Hero.css';

const Hero: React.FC = () => {
    return (
        <section className="hero-section">
            <div className="hero-content">
                <h1 className="hero-title">
                    SCENT<br />
                    NOT FOUND<br />
                    <span className="hero-subtitle">404</span>
                </h1>
                <p className="hero-description">
                    찾을 수 없는 향기,<br />
                    당신만의 고유한 분위기를 완성하세요.
                </p>
            </div>
            <div className="spline-container">
                <iframe
                    src='https://my.spline.design/distortingtypography-A7Aajh5JHTVBgulrZSWTBEZ2/?v=2'
                    frameBorder='0'
                    width='100%'
                    height='100%'
                    title="Spline 3D Scene"
                    className="spline-iframe"
                ></iframe>
            </div>
        </section>
    );
};

export default Hero;
