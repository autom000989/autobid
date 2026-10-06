import React, { useState, useEffect, useRef } from 'react';
import { User, SupportChat, ChatMessage } from '../types';
import { db, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc, doc, getDocs } from '../firebase';

interface HelpSupportProps {
  currentUser: User;
  onNavigate: (view: string) => void;
}

export const HelpSupport: React.FC<HelpSupportProps> = ({ currentUser, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'help' | 'verify'>('help');
  const [chatMode, setChatMode] = useState(false);
  const [ticketMode, setTicketMode] = useState(false);
  
  // Verification State
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(currentUser.email || '');
  const [docName, setDocName] = useState('');
  
  // Chat State
  const [chat, setChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  
  // Ticket State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatMode) {
      // Find existing chat or create one
      const q = query(collection(db, 'support_chats'), where('userId', '==', currentUser.id), where('status', 'in', ['open', 'active']));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const c = { id: snap.docs[0].id, ...snap.docs[0].data() } as SupportChat;
          setChat(c);
          
          if (c.unreadCountUser && c.unreadCountUser > 0) {
              updateDoc(doc(db, 'support_chats', c.id), { unreadCountUser: 0 });
          }
        } else {
          setChat(null);
        }
      }, (err) => console.error("Chat fetch error:", err));
      return () => unsub();
    }
  }, [chatMode, currentUser.id]);

  useEffect(() => {
    if (chat) {
      const q = query(collection(db, 'support_chats', chat.id, 'messages'), orderBy('timestamp', 'asc'));
      const unsub = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
        setMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }, (err) => console.error("Messages fetch error:", err));
      return () => unsub();
    }
  }, [chat]);

  const startChat = async () => {
    setChatMode(true);
    if (!chat) {
      const newChat = {
        userId: currentUser.id,
        username: currentUser.username,
        status: 'open',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        unreadCountAdmin: 0,
        unreadCountUser: 0
      };
      const res = await addDoc(collection(db, 'support_chats'), newChat);
      setChat({ id: res.id, ...newChat } as SupportChat);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() || !chat) return;
    
    const text = msgInput;
    setMsgInput('');
    
    await addDoc(collection(db, 'support_chats', chat.id, 'messages'), {
      chatId: chat.id,
      senderId: currentUser.id,
      senderRole: currentUser.role || 'user',
      text,
      timestamp: Date.now()
    });
    
    await updateDoc(doc(db, 'support_chats', chat.id), {
       updatedAt: Date.now(),
       unreadCountAdmin: (chat.unreadCountAdmin || 0) + 1,
       status: 'open'
    });
  };

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !docName) {
       alert('Please fill out phone and document name.');
       return;
    }
    try {
      await addDoc(collection(db, 'appeals'), {
         userId: currentUser.id,
         reason: 'Verification Request',
         type: 'verification',
         phone,
         email,
         documents: docName,
         status: 'pending',
         createdAt: Date.now()
      });
      alert('Verification request submitted successfully. Our team will review your documents soon.');
      setPhone('');
      setDocName('');
      setActiveTab('help');
    } catch (err: any) {
      alert('Error submitting request: ' + err.message);
    }
  };

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDesc) return;
    try {
      await addDoc(collection(db, 'tickets'), {
         userId: currentUser.id,
         subject: ticketSubject,
         description: ticketDesc,
         status: 'open',
         createdAt: Date.now()
      });
      alert('Support ticket raised successfully.');
      setTicketMode(false);
      setTicketSubject('');
      setTicketDesc('');
    } catch (err: any) {
      alert('Error raising ticket: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
       <div className="flex justify-between items-center mb-8">
           <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
           <div className="flex gap-2">
               <button onClick={() => setActiveTab('help')} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'help' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'}`}>Support</button>
               <button onClick={() => setActiveTab('verify')} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'verify' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'}`}>Get Verified</button>
           </div>
       </div>

       {activeTab === 'help' && !chatMode && !ticketMode && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="glass-panel p-6 rounded-3xl text-center hover:-translate-y-2 transition-transform cursor-pointer" onClick={startChat}>
                   <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                   </div>
                   <h3 className="text-lg font-bold text-gray-900 mb-2">Live Chat</h3>
                   <p className="text-gray-500 text-sm">Chat with our support team in real-time.</p>
               </div>
               <a href="mailto:support@autobid.com" className="glass-panel p-6 rounded-3xl text-center hover:-translate-y-2 transition-transform block">
                   <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                   </div>
                   <h3 className="text-lg font-bold text-gray-900 mb-2">Email Support</h3>
                   <p className="text-gray-500 text-sm">Send us an email at support@autobid.com</p>
               </a>
               <div className="glass-panel p-6 rounded-3xl text-center hover:-translate-y-2 transition-transform cursor-pointer" onClick={() => setTicketMode(true)}>
                   <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                   </div>
                   <h3 className="text-lg font-bold text-gray-900 mb-2">Raise Ticket</h3>
                   <p className="text-gray-500 text-sm">Create a ticket for complex issues.</p>
               </div>
           </div>
       )}

       {chatMode && (
           <div className="glass-panel rounded-3xl overflow-hidden flex flex-col" style={{ height: '600px' }}>
               <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                   <h3 className="font-bold">Live Support Chat</h3>
                   <button onClick={() => setChatMode(false)} className="text-white hover:text-gray-300">Close</button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                   {messages.map(m => (
                       <div key={m.id} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[70%] p-3 rounded-2xl ${m.senderId === currentUser.id ? 'bg-red-600 text-white rounded-tr-none' : 'bg-gray-200 text-gray-900 rounded-tl-none'}`}>
                               <p className="text-sm">{m.text}</p>
                           </div>
                       </div>
                   ))}
                   <div ref={messagesEndRef} />
               </div>
               <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
                   <input 
                       type="text" 
                       value={msgInput} 
                       onChange={e => setMsgInput(e.target.value)}
                       placeholder="Type your message..."
                       className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-red-400"
                   />
                   <button type="submit" className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
                       <svg className="w-5 h-5 translate-x-[-2px] translate-y-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                   </button>
               </form>
           </div>
       )}

       {ticketMode && (
           <div className="glass-panel p-8 rounded-3xl max-w-2xl mx-auto">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold">Raise a Support Ticket</h2>
                   <button onClick={() => setTicketMode(false)} className="text-gray-500 hover:text-gray-900">Cancel</button>
               </div>
               <form onSubmit={submitTicket} className="space-y-4">
                   <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                       <input type="text" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} required className="w-full border rounded-xl px-4 py-2" />
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                       <textarea value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} required rows={4} className="w-full border rounded-xl px-4 py-2"></textarea>
                   </div>
                   <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors">Submit Ticket</button>
               </form>
           </div>
       )}

       {activeTab === 'verify' && (
           <div className="glass-panel p-8 rounded-3xl max-w-2xl mx-auto">
               {currentUser.isVerified ? (
                   <div className="text-center py-8">
                       <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                           <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                       </div>
                       <h2 className="text-2xl font-bold text-gray-900">You are verified!</h2>
                       <p className="text-gray-500 mt-2">You already have a verified badge.</p>
                   </div>
               ) : (
                   <>
                       <h2 className="text-2xl font-bold mb-2">Request Verification Batch</h2>
                       <p className="text-gray-500 mb-6 text-sm">Upload your documents to get a verified badge on your profile. This helps build trust within the community.</p>
                       <form onSubmit={submitVerification} className="space-y-4">
                           <div>
                               <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                               <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border rounded-xl px-4 py-2 bg-gray-50" />
                           </div>
                           <div>
                               <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                               <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+1 234 567 8900" className="w-full border rounded-xl px-4 py-2 bg-gray-50" />
                           </div>
                           <div>
                               <label className="block text-sm font-bold text-gray-700 mb-1">Documents (ID, Driving License, Photo)</label>
                               <input type="file" onChange={e => setDocName(e.target.files?.[0]?.name || 'uploaded_docs.pdf')} multiple className="w-full border rounded-xl px-4 py-2 bg-gray-50 text-sm" />
                               <p className="text-xs text-gray-400 mt-1">For this preview, selecting files simulates an upload securely.</p>
                           </div>
                           <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors mt-4">Submit Documents</button>
                       </form>
                   </>
               )}
           </div>
       )}
    </div>
  );
}
