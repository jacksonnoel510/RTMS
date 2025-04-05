// src/App.jsx
import './App.css';
import systemImage from './assets/R.jpeg';
function App() {
  return (
    <div className="landing-container">
      <div className="content-wrapper">
        <h1>Real Time Weight Measuring System</h1>
        <p className="subtitle">Ensure safety compliance and efficiency</p>
        <div className="image-container">
          <img 
            src={systemImage} 
            alt="Real Time Weight Measuring System" 
            className="system-image"
          />
        </div>
        
        <div className="divider"></div>
        
        <p className="description">
          Experience accurate, real-time weight measurement and monitoring with ease. 
          Our system ensures precision, efficiency, and reliability, making weight 
          tracking seamless for various applications. Stay informed with instant 
          updates and data insights to enhance your operations.
        </p>
        
        <div className="divider"></div>
        
        
<button className="cta-button" onClick={() => window.location.href = '/login'}>
  Get Started
</button>
      </div>
    </div>
  );
}

export default App;