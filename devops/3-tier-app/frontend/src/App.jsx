import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL

export default function App() {
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    fetchTodos()
  }, [])

  async function fetchTodos() {
    const res = await fetch(`${API}/todos`)
    setTodos(await res.json())
  }

  async function addTodo(e) {
    e.preventDefault()
    if (!input.trim()) return
    await fetch(`${API}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.trim() }),
    })
    setInput('')
    fetchTodos()
  }

  async function toggleTodo(todo) {
    await fetch(`${API}/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    })
    fetchTodos()
  }

  async function deleteTodo(id) {
    await fetch(`${API}/todos/${id}`, { method: 'DELETE' })
    fetchTodos()
  }

  function startEdit(todo) {
    setEditId(todo.id)
    setEditText(todo.title)
  }

  async function saveEdit(id) {
    if (!editText.trim()) return
    await fetch(`${API}/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editText.trim() }),
    })
    setEditId(null)
    fetchTodos()
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.heading}>Todos</h1>

        <form onSubmit={addTodo} style={s.form}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="What needs to be done?"
            style={s.input}
          />
          <button type="submit" style={s.btnPrimary}>Add</button>
        </form>

        <ul style={s.list}>
          {todos.map(todo => (
            <li key={todo.id} style={s.item}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo)}
                style={s.checkbox}
              />

              {editId === todo.id ? (
                <>
                  <input
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(todo.id)
                      if (e.key === 'Escape') setEditId(null)
                    }}
                    style={{ ...s.input, flex: 1 }}
                    autoFocus
                  />
                  <button onClick={() => saveEdit(todo.id)} style={s.btnPrimary}>Save</button>
                  <button onClick={() => setEditId(null)} style={s.btnGhost}>Cancel</button>
                </>
              ) : (
                <>
                  <span
                    style={{
                      ...s.title,
                      textDecoration: todo.completed ? 'line-through' : 'none',
                      color: todo.completed ? '#9ca3af' : '#111827',
                    }}
                  >
                    {todo.title}
                  </span>
                  <button onClick={() => startEdit(todo)} style={s.btnGhost}>Edit</button>
                  <button onClick={() => deleteTodo(todo.id)} style={s.btnDanger}>Delete</button>
                </>
              )}
            </li>
          ))}
        </ul>

        {todos.length === 0 && (
          <p style={s.empty}>No todos yet — add one above.</p>
        )}
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
    display: 'flex',
    justifyContent: 'center',
    padding: '60px 16px',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,.08)',
    padding: '36px 32px',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'flex-start',
  },
  heading: { margin: '0 0 28px', fontSize: 28, fontWeight: 700, color: '#111827' },
  form: { display: 'flex', gap: 8, marginBottom: 24 },
  input: {
    flex: 1,
    padding: '9px 13px',
    fontSize: 15,
    border: '1px solid #d1d5db',
    borderRadius: 7,
    outline: 'none',
    color: '#111827',
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  checkbox: { width: 17, height: 17, cursor: 'pointer', accentColor: '#2563eb' },
  title: { flex: 1, fontSize: 15 },
  btnPrimary: {
    padding: '7px 16px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  btnGhost: {
    padding: '5px 12px',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  btnDanger: {
    padding: '5px 12px',
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 32, fontSize: 15 },
}
