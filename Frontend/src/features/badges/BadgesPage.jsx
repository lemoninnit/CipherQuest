import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import './BadgesPage.css';

const BadgesPage = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTodoName, setNewTodoName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchTodos() {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        throw error;
      }
      setTodos(data || []);
    } catch (err) {
      console.error('Error fetching todos from Supabase:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodoName.trim()) return;

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('todos')
        .insert([{ name: newTodoName.trim() }])
        .select();

      if (error) throw error;

      setTodos((prev) => [...prev, ...((data) || [])]);
      setNewTodoName('');
      fetchTodos();
    } catch (err) {
      console.error('Error adding todo:', err);
      alert('Error adding todo: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchTodos();
    } catch (err) {
      console.error('Error updating todo:', err);
      fetchTodos();
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Error deleting todo:', err);
      alert('Error deleting todo: ' + err.message);
    }
  };

  return (
    <div className="missions-container">
      <div className="missions-header glass-card">
        <div className="header-tag">Supabase Cloud Sync</div>
        <h2 className="header-title-main">Agent Mission Board & Badges</h2>
        <p className="header-desc-main">
          These active objectives are synced dynamically in real-time from the cloud-hosted <strong>Supabase</strong> PostgreSQL database instance.
        </p>
      </div>

      <div className="missions-grid">
        {/* Terminal Input */}
        <div className="glass-card mission-input-card">
          <h3 className="card-subtitle"><span className="terminal-prompt">&gt;</span> Initialize New Mission</h3>
          <form onSubmit={handleAddTodo} className="todo-form">
            <div className="input-group">
              <span className="material-symbols-outlined input-icon">add_task</span>
              <input
                type="text"
                placeholder="Enter mission objective..."
                value={newTodoName}
                onChange={(e) => setNewTodoName(e.target.value)}
                disabled={submitting}
                className="mission-input"
              />
            </div>
            <button type="submit" className="btn-add-mission" disabled={submitting || !newTodoName.trim()}>
              {submitting ? 'Transmitting...' : 'Deploy Mission'}
            </button>
          </form>
          <div className="supabase-status-badge">
            <span className="status-dot online"></span>
            Connected to: <span className="status-url">jacbtscvbixzsfbkkjcf.supabase.co</span>
          </div>
        </div>

        {/* Missions List */}
        <div className="glass-card mission-list-card">
          <div className="list-header">
            <h3 className="card-subtitle"><span className="terminal-prompt">&gt;</span> Active Objectives</h3>
            <button className="btn-refresh" onClick={fetchTodos} disabled={loading}>
              <span className={`material-symbols-outlined ${loading ? 'spin' : ''}`}>sync</span>
            </button>
          </div>

          {loading ? (
            <div className="loading-placeholder">
              <div className="spinner"></div>
              <p>Decrypting mission database...</p>
            </div>
          ) : error ? (
            <div className="error-placeholder border-error-hover">
              <span className="material-symbols-outlined error-icon">database_off</span>
              <h4>Database Connection Incomplete</h4>
              <p className="error-explanation">
                The connection to Supabase succeeded, but the <code>todos</code> table might not exist yet, or Row Level Security (RLS) is preventing public access.
              </p>
              <div className="solution-steps">
                <h5>To resolve this:</h5>
                <ol>
                  <li>Go to your <strong>Supabase Dashboard</strong></li>
                  <li>Open the <strong>SQL Editor</strong></li>
                  <li>Paste and run the following command:</li>
                </ol>
                <pre className="code-snippet">
{`create table todos (
  id bigint generated always as identity primary key,
  name text not null,
  is_completed boolean default false
);

-- Enable RLS
alter table todos enable row level security;

-- Create policy to allow all actions for demo
create policy "Allow public access" 
  on todos for all 
  using (true) 
  with check (true);`}
                </pre>
              </div>
            </div>
          ) : todos.length === 0 ? (
            <div className="empty-placeholder">
              <span className="material-symbols-outlined empty-icon">assignment_turned_in</span>
              <p>All objectives secured. No active missions found.</p>
              <p className="empty-subtext">Add a new mission using the terminal on the left.</p>
            </div>
          ) : (
            <ul className="todos-list">
              {todos.map((todo) => (
                <li key={todo.id} className={`todo-item glass-card ${todo.is_completed ? 'completed' : ''}`}>
                  <button 
                    className="todo-checkbox"
                    type="button"
                    onClick={() => handleToggleComplete(todo.id, todo.is_completed)}
                  >
                    <span className="material-symbols-outlined">
                      {todo.is_completed ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  </button>
                  <span className="todo-text">{todo.name}</span>
                  <button 
                    className="todo-delete-btn"
                    type="button"
                    onClick={() => handleDeleteTodo(todo.id)}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgesPage;
