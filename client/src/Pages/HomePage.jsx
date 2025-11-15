import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#e74c3c', fontSize: '36px', marginBottom: '20px' }}>
        🚑 Dispatch - EMT Training Platform
      </h1>
      <p style={{ fontSize: '18px', marginBottom: '30px', color: '#555' }}>
        Practice your EMT assessment skills with AI-powered patient simulations
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <Link 
          to="/simulation" 
          style={{
            display: 'inline-block',
            padding: '15px 30px',
            background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '18px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Start EMT Simulation
        </Link>
        
        <Link 
          to="/temp" 
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            color: '#666',
            textDecoration: 'none',
            textAlign: 'center'
          }}
        >
          Temp Page
        </Link>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h2 style={{ color: '#333', marginTop: 0 }}>Features</h2>
        <ul style={{ lineHeight: '1.8', color: '#555' }}>
          <li><strong>AI Patient Simulation:</strong> Realistic patient scenarios with dynamic symptoms</li>
          <li><strong>AI Instructor:</strong> Real-time feedback on your assessment skills</li>
          <li><strong>Multiple Scenarios:</strong> Various emergency situations to practice</li>
          <li><strong>Assessment Training:</strong> Practice ABCDE, SAMPLE, and other protocols</li>
        </ul>
      </div>
    </div>
  );
}

export default HomePage;

