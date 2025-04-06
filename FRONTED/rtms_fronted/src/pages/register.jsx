import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/Login.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: ''
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:8000/api/auth/register/', {
        first_name: formData.first_name,
        last_name: formData.last_name,    
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.password2
      });

      // Save tokens to localStorage
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      
      navigate('/dashboard'); // Redirect to protected route
    } catch (err) {
      if (err.response?.data) {
        // Handle Django validation errors
        const errors = [];
        for (const [field, messages] of Object.entries(err.response.data)) {
          errors.push(`${field}: ${Array.isArray(messages) ? messages.join(' ') : messages}`);
        }
        setError(errors.join('\n'));
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content-wrapper">
        <h2 className="login-title">Register</h2>
        
        {error && <div className="error-message" style={{whiteSpace: 'pre-line'}}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
        <div className="form-group">
            <label htmlFor="username">FirstName*</label>
            <input
              type="text"
              id="username"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">LastName*</label>
            <input
              type="text"
              id="username"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>


          <div className="form-group">
            <label htmlFor="username">Username*</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password*</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password2">Confirm Password*</label>
            <input
              type="password"
              id="password2"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <div className="register-link">
          Already have an account? <Link to="/login" className="register-link-text">Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;