import React, { useState } from 'react';
import { Search, Book, MessageCircle, Phone, Mail, ExternalLink, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const faqs = [
  {
    question: 'How do I connect with investors?',
    answer: 'You can browse our investor directory and send connection requests. Once an investor accepts, you can start messaging them directly through our platform.'
  },
  {
    question: 'What should I include in my startup profile?',
    answer: 'Your startup profile should include a compelling pitch, funding needs, team information, market opportunity, and any traction or metrics that demonstrate your progress.'
  },
  {
    question: 'How do I share documents securely?',
    answer: 'You can upload documents to your secure document vault and selectively share them with connected investors. All documents are encrypted and access-controlled.'
  },
  {
    question: 'What are collaboration requests?',
    answer: 'Collaboration requests are formal expressions of interest from investors. They indicate that an investor wants to learn more about your startup and potentially discuss investment opportunities.'
  }
];

const docs = [
  {
    title: 'Platform Onboarding Guide',
    excerpt: 'Step-by-step walkthrough for setting up your profile, uploading verification documents, and preparing your platform metrics.',
    category: 'Getting Started'
  },
  {
    title: 'Security and Multi-Factor Authentication',
    excerpt: 'Learn how Nexus handles secure transaction vaults, PDF signature verification, and how to enable 2-Factor authentication (MFA) via settings.',
    category: 'Security'
  },
  {
    title: 'Investment Deal Pipelines',
    excerpt: 'Detailed tutorial on how investors can create investment deals, track progress stages from negotiation to closing, and notify entrepreneurs.',
    category: 'Investment'
  }
];

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export const HelpPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'faq' | 'bot' | 'contact'>('faq');
  const [searchQuery, setSearchQuery] = useState('');

  // Support ticket form state
  const [ticket, setTicket] = useState({ name: '', email: '', message: '' });
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Bot chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: 'Hello! I am your Nexus Support Bot. How can I help you today?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingToBot, setSendingToBot] = useState(false);

  const getLocalBotResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('meeting') || q.includes('schedule') || q.includes('calendar') || q.includes('call') || q.includes('room')) {
      return "Nexus includes an advanced conflict-free meeting calendar. When you request a meeting, our backend checks for double-bookings on both schedules. Once accepted, you can initiate a high-definition WebRTC Video Call room or join instantly by entering a Room ID. You can also invite additional guests to the call by sharing the Room ID.";
    }
    if (q.includes('deal') || q.includes('invest') || q.includes('pipeline') || q.includes('equity') || q.includes('portfolio')) {
      return "The Deals page allows venture investors to manage their investment pipeline. Investors can create deals, specify funding amounts, equity share, and track stages (e.g. Due Diligence, Term Sheet, closed). Creating or updating a deal instantly sends notifications to the entrepreneur's dashboard.";
    }
    if (q.includes('document') || q.includes('vault') || q.includes('upload') || q.includes('sign') || q.includes('pdf')) {
      return "Our Document Vault provides secure cloud storage with strict validation. You can upload pitch decks and legal agreements, selectively share them with connected members, and complete digital signatures directly in your browser using canvas typing or drawing tools.";
    }
    if (q.includes('security') || q.includes('mfa') || q.includes('2fa') || q.includes('factor')) {
      return "Nexus secures your account using token rotation and email-based Two-Factor Authentication (2FA). You can toggle 2FA on/off from Settings > Security, which sends a one-time OTP to your email on login attempts.";
    }
    if (q.includes('profile') || q.includes('startup') || q.includes('edit') || q.includes('bio')) {
      return "You can update your personal information and criteria in Settings > Profile. Entrepreneurs can update startup parameters (team size, founded year, website), while Investors can specify investment ranges.";
    }
    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      return "Hello! Welcome to Nexus Support. I can help you with questions about scheduling Meetings, tracking Investment Deals, using the Document Vault, or configuring Account Security. What can I assist you with today?";
    }
    return "Nexus is a premium hub connecting startups with venture capital. It supports real-time chat messaging, video call rooms, secure document signatures, and payment ledgers. Please ask me about meetings, document sharing, deals, or security for detailed answers!";
  };

  const handleSendToBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingToBot) return;

    const userMsg = chatInput.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg, time: timeStr }]);
    setChatInput('');
    setSendingToBot(true);

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are the Support Bot for Nexus, a platform that connects startups/entrepreneurs with venture capitalists/investors. Be professional, friendly, and helpful. Use the following context if relevant:
              FAQs: ${JSON.stringify(faqs)}
              User query: ${userMsg}`
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('API key validation or network error');
      }

      const data = await response.json();
      const botText = data.candidates?.[0]?.content?.parts?.[0]?.text || getLocalBotResponse(userMsg);
      setChatMessages(prev => [...prev, { sender: 'bot', text: botText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch {
      // Smart local response fallback instead of printing a raw system error
      const botText = getLocalBotResponse(userMsg);
      setChatMessages(prev => [...prev, { sender: 'bot', text: botText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setSendingToBot(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket.name || !ticket.email || !ticket.message) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmittingTicket(true);
    try {
      await axiosInstance.post('/support', ticket);
      toast.success('Your message has been submitted to support team!');
      setTicket({ name: '', email: '', message: '' });
    } catch {
      toast.error('Failed to submit support request');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
        <p className="text-gray-600">Find answers, learn more about Nexus, or chat with our AI Support Assistant</p>
      </div>

      {/* Tabs / Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card onClick={() => setActiveTab('faq')} className={`cursor-pointer border-2 transition-all ${activeTab === 'faq' ? 'border-purple-500 bg-purple-50/10' : 'border-transparent hover:border-gray-200'}`}>
          <CardBody className="text-center p-6 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4">
              <Book size={24} className="text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Documentation & FAQ</h2>
            <p className="text-sm text-gray-500 mt-2">Browse FAQs and detailed platform usage manuals</p>
          </CardBody>
        </Card>

        <Card onClick={() => setActiveTab('bot')} className={`cursor-pointer border-2 transition-all ${activeTab === 'bot' ? 'border-purple-500 bg-purple-50/10' : 'border-transparent hover:border-gray-200'}`}>
          <CardBody className="text-center p-6 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4 animate-pulse">
              <MessageCircle size={24} className="text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Gemini Live Bot</h2>
            <p className="text-sm text-gray-500 mt-2">Interact with our active AI support assistant 24/7</p>
          </CardBody>
        </Card>

        <Card onClick={() => setActiveTab('contact')} className={`cursor-pointer border-2 transition-all ${activeTab === 'contact' ? 'border-purple-500 bg-purple-50/10' : 'border-transparent hover:border-gray-200'}`}>
          <CardBody className="text-center p-6 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4">
              <Phone size={24} className="text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Submit Support Ticket</h2>
            <p className="text-sm text-gray-500 mt-2">Send message directly to platform administrators</p>
          </CardBody>
        </Card>
      </div>

      {/* Tab Panel contents */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          {/* FAQ Search */}
          <div className="max-w-2xl">
            <Input
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              startAdornment={<Search size={18} />}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Documentation articles */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 px-1">Help Guides</h2>
              {docs.map((doc, idx) => (
                <Card key={idx} hoverable>
                  <CardBody className="p-4 space-y-2">
                    <span className="text-[10px] uppercase font-semibold text-purple-600 tracking-wider block">{doc.category}</span>
                    <h3 className="text-sm font-semibold text-gray-900">{doc.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{doc.excerpt}</p>
                    <button className="text-xs text-purple-600 font-semibold flex items-center gap-1 hover:underline pt-1">
                      Read Article <ExternalLink size={10} />
                    </button>
                  </CardBody>
                </Card>
              ))}
            </div>

            {/* FAQs */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 px-1">Frequently Asked Questions</h2>
              <Card>
                <CardBody className="divide-y divide-gray-100 p-0">
                  {filteredFaqs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No FAQs matches your query.</div>
                  ) : (
                    filteredFaqs.map((faq, index) => (
                      <div key={index} className="p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">{faq.question}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bot' && (
        <Card className="max-w-3xl mx-auto border border-gray-100 flex flex-col h-[500px]">
          <CardHeader className="bg-gray-50 border-b border-gray-100 py-3 px-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="font-semibold text-gray-900 text-sm">Gemini AI Assistant</span>
            </div>
            <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded font-mono">1.5 Flash</span>
          </CardHeader>
          <CardBody className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[10px] font-semibold text-gray-400 capitalize">{msg.sender}</span>
                  <span className="text-[9px] text-gray-400">{msg.time}</span>
                </div>
                <div className={`text-sm px-3.5 py-2 rounded-2xl max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                  msg.sender === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {sendingToBot && (
              <div className="flex gap-2 items-center text-gray-400 text-xs pl-2">
                <Loader2 size={12} className="animate-spin text-purple-600" />
                <span>Gemini is thinking...</span>
              </div>
            )}
          </CardBody>
          <form onSubmit={handleSendToBot} className="p-3 border-t border-gray-100 flex gap-2 bg-white rounded-b-2xl">
            <input
              type="text"
              placeholder="Ask anything about Nexus..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={sendingToBot}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-purple-400 transition-colors"
            />
            <Button type="submit" disabled={!chatInput.trim() || sendingToBot}>
              <Send size={14} />
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'contact' && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <h2 className="text-lg font-bold text-gray-900">Submit Support Inquiry</h2>
            <p className="text-xs text-gray-500 mt-0.5">Fill out your message and we'll reply as soon as possible.</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  placeholder="Your full name"
                  value={ticket.name}
                  onChange={e => setTicket(t => ({ ...t, name: e.target.value }))}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="your@email.com"
                  value={ticket.email}
                  onChange={e => setTicket(t => ({ ...t, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Message</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 p-4 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-none"
                  rows={4}
                  placeholder="Explain your problem or inquiry in detail..."
                  value={ticket.message}
                  onChange={e => setTicket(t => ({ ...t, message: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={submittingTicket}
                  leftIcon={submittingTicket ? <Loader2 size={14} className="animate-spin" /> : undefined}
                >
                  {submittingTicket ? 'Submitting...' : 'Send Message'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
};