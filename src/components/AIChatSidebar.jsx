import React, { useState, useEffect, useRef } from 'react';
import { aiAssistantPromptResponses } from '../data/mockData';

export default function AIChatSidebar({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'assistant', text: aiAssistantPromptResponses.greet }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const query = input.toLowerCase();
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking and typing response
    setTimeout(() => {
      let responseText = "I'm processing that question. We specialize in high-volume liquidation auctions! For specifics on applying or roles, let me know if you are interested in warehouse processing, cataloging, customer service, or forklift operations.";
      
      if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
        responseText = aiAssistantPromptResponses.greet;
      } else if (query.includes('culture') || query.includes('work') || query.includes('like to work')) {
        responseText = aiAssistantPromptResponses.culture;
      } else if (query.includes('benefit') || query.includes('pay') || query.includes('salary') || query.includes('health')) {
        responseText = aiAssistantPromptResponses.benefits;
      } else if (query.includes('cataloger') || query.includes('grading') || query.includes('listing')) {
        responseText = aiAssistantPromptResponses.catalogerPrep;
      } else if (query.includes('warehouse') || query.includes('processing') || query.includes('lifting')) {
        responseText = aiAssistantPromptResponses.warehousePrep;
      } else if (query.includes('forklift') || query.includes('operator')) {
        responseText = "Our Forklift Operator role requires active certification (OSHA) and experience loading heavy warehouse racks safely. The pay range is $19.00 to $22.50 per hour. Would you like to view active forklift openings?";
      } else if (query.includes('pickup') || query.includes('customer')) {
        responseText = "Customer Pickup Associates assist winners with retrieval, invoice validation, and loading. Requires excellent people skills and physical stamina. Available in Monroe and Charlotte locations.";
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'assistant', text: responseText }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '380px',
      maxWidth: '100%',
      backgroundColor: 'var(--bg-dark)',
      borderLeft: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            background: 'var(--success)',
            borderRadius: '99px',
            boxShadow: '0 0 8px var(--success)'
          }}></div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>AI Career Assistant</h3>
        </div>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '1.2rem'
        }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{
        flexGrow: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
            color: 'var(--text-primary)',
            padding: '10px 14px',
            borderRadius: '12px',
            borderBottomRightRadius: msg.sender === 'user' ? '2px' : '12px',
            borderBottomLeftRadius: msg.sender === 'assistant' ? '2px' : '12px',
            maxWidth: '85%',
            fontSize: '0.9rem',
            lineHeight: 1.4,
            border: msg.sender === 'assistant' ? '1px solid var(--border-color)' : 'none'
          }}>
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div style={{
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(255,255,255,0.04)',
            padding: '10px 14px',
            borderRadius: '12px',
            borderBottomLeftRadius: '2px',
            border: '1px solid var(--border-color)',
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
          }}>
            <span>AI is typing</span>
            <span className="pulse-glow-blue" style={{ width: '4px', height: '4px', background: 'var(--primary)', borderRadius: '50%' }}></span>
            <span className="pulse-glow-blue" style={{ width: '4px', height: '4px', background: 'var(--primary)', borderRadius: '50%', animationDelay: '0.2s' }}></span>
            <span className="pulse-glow-blue" style={{ width: '4px', height: '4px', background: 'var(--primary)', borderRadius: '50%', animationDelay: '0.4s' }}></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: '16px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        gap: '8px',
        background: 'rgba(0,0,0,0.1)'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about benefits, requirements..."
          style={{
            flexGrow: 1,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '10px 12px',
            color: 'white',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '8px 14px' }}>
          Send
        </button>
      </form>
    </div>
  );
}
