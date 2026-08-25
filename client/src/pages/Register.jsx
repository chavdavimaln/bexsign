import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        navigate('/login'); // Redirect to login upon successful sign up
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md border border-gray-100 text-bexText">
        <h2 className="text-3xl font-bold text-center mb-2 text-bexPrimary">BexSign</h2>
        <p className="text-center text-gray-600 mb-6">Create a new account</p>

        {error && <div className="mb-4 p-3 bg-red-50 text-bexPrimary text-sm rounded">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input 
                type="text" 
                name="firstName" 
                required 
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E71414] text-black text-sm"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input 
                type="text" 
                name="lastName" 
                required 
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E71414] text-black text-sm"
                onChange={handleChange}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email ID</label>
            <input 
              type="email" 
              name="email" 
              required 
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E71414] text-black text-sm"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E71414] text-black text-sm"
              onChange={handleChange}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-bexPrimary text-white py-2 rounded-md font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-bexPrimary font-semibold hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
}
