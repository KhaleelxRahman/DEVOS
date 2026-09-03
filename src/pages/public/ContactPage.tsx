import React, { useState } from 'react';
import { Send, Mail, Phone, User, Building, Sparkles } from 'lucide-react';
import { Button } from '../../components/common';

export const ContactPage: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setTimeout(() => {
      setStatus('success');
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', background: '#020617', color: '#f8fafc', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Background Aurora */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '60vh', background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.15), rgba(15, 23, 42, 0) 70%)', zIndex: 0, pointerEvents: 'none' }} />

      <section style={{ width: '100%', maxWidth: 900, padding: '140px 24px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 9999, color: '#60a5fa', fontSize: '13px', fontWeight: 600, marginBottom: 24, boxShadow: '0 0 20px rgba(37, 99, 235, 0.15)' }}>
          <Sparkles size={14} /> Enterprise Support & Leadership
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 20px 0', color: '#fff' }}>
          Get in Touch with DEVOS
        </h1>
        <p style={{ fontSize: '18px', color: '#cbd5e1', lineHeight: 1.6, maxWidth: 680, margin: 0 }}>
          Connect directly with our engineering leadership or send an enterprise support inquiry. We respond within 24 hours.
        </p>
      </section>

      <section style={{ width: '100%', maxWidth: 1100, padding: '20px 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 40, alignItems: 'start', position: 'relative', zIndex: 1 }}>
        {/* Direct Contact Card */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 24, padding: 40, backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', gap: 32, boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>Direct Leadership Contact</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Reach out for enterprise partnerships, executive inquiries, or direct technical support.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'rgba(2, 6, 23, 0.4)', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <User size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Lead Engineer</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Md. Khaleel Ur Rahman</div>
              </div>
            </div>

            <a href="mailto:mdkhaleelurrahman51@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'rgba(2, 6, 23, 0.4)', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.05)', textDecoration: 'none', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <Mail size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Email Address</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>mdkhaleelurrahman51@gmail.com</div>
              </div>
            </a>

            <a href="tel:7842835936" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'rgba(2, 6, 23, 0.4)', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.05)', textDecoration: 'none', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <Phone size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Direct Phone</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>7842835936</div>
              </div>
            </a>
          </div>
        </div>

        {/* Contact Form Panel */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 24, padding: 40, backdropFilter: 'blur(16px)', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
          {status === 'success' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '40px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={28} />
              </div>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#fff' }}>Message Dispatched!</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Thank you for reaching out. We will review your message and reply promptly.</p>
              <Button variant="ghost" onClick={() => setStatus('idle')} style={{ marginTop: 16 }}>Send another message</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>Send an Inquiry</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>Your Name</label>
                <input required type="text" placeholder="John Smith" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(2, 6, 23, 0.6)', color: '#fff', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>Email Address</label>
                <input required type="email" placeholder="john@enterprise.com" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(2, 6, 23, 0.6)', color: '#fff', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>Subject</label>
                <select style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(2, 6, 23, 0.6)', color: '#fff', fontSize: '14px', outline: 'none', appearance: 'none' }}>
                  <option style={{ background: '#0f172a' }}>Enterprise Collaboration</option>
                  <option style={{ background: '#0f172a' }}>Technical Support</option>
                  <option style={{ background: '#0f172a' }}>Feature Request</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>Message</label>
                <textarea required rows={4} placeholder="How can DEVOS assist your engineering team?" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(2, 6, 23, 0.6)', color: '#fff', fontSize: '14px', resize: 'vertical', outline: 'none' }} />
              </div>
              <Button type="submit" variant="primary" size="lg" loading={status === 'submitting'} rightIcon={<Send size={16} />} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', height: 48 }}>
                Send Message
              </Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

