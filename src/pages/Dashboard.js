import React from 'react';

function Dashboard({ user, onLogout }) {
  return (
    <div className="dashboard">
      <header>
        <h1>TelCo Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user.name}</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>
      
      <main>
        <h2>Welcome to TelCo Inventory Management System</h2>
        <p>This is a simple dashboard page.</p>
      </main>
    </div>
  );
}

export default Dashboard;