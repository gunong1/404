import React from 'react';
import './Hero.css';

const Hero: React.FC = () => {
    return (
        <section className="hero-section">
            <div className="spline-container">
                <iframe
                    src='https://my.spline.design/distortingtypography-A7Aajh5JHTVBgulrZSWTBEZ2/?v=2'
                    frameBorder='0'
                    width='100%'
                    height='100%'
                    title="Spline 3D Scene"
                    className="spline-iframe"
                ></iframe>

                {/* Overlay Text (Optional - can be added back if needed) */}
                <div className="hero-overlay">
                    {/* Content can go here overlaying the 3D scene */}
                </div>
            </div>
        </section>
    );
};

export default Hero;
