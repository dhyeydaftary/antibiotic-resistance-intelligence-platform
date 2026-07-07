import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function PredictionInputPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    organism: '',
  });

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    console.log('Form submitted:', formData);
    navigate('/predict/result/test123');
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Prediction Input Page</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px' }}>
        <label>
          Age
          <input type="number" name="age" value={formData.age} onChange={handleChange} />
        </label>

        <label>
          Gender
          <select name="gender" value={formData.gender} onChange={handleChange}>
            <option value="">Select</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label>
          Organism
          <input type="text" name="organism" value={formData.organism} onChange={handleChange} />
        </label>

        <button type="submit">Predict Susceptibility</button>
      </form>
    </div>
  );
}

export default PredictionInputPage;