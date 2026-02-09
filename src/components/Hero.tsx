import React from 'react';
import './Hero.css';

const Hero: React.FC = () => {
    return (
        <section className="hero-section">
            <div className="hero-content">
                <p className="hero-description" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                    향을 덮지 않습니다.<br />
                    냄새의 원인을 삭제합니다.
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
