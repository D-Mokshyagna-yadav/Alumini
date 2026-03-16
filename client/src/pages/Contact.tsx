import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Clock, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.show('Message sent! We will get back to you soon.', 'success');
        setFormData({ name: '', email: '', subject: '', message: '' });
        setIsSubmitting(false);
    };

    const contactInfo = [
        {
            icon: MapPin,
            title: 'Visit Us',
            content: 'DVR & DR. HS MIC College of Technology\nKanchikacherla, N.T.R District\nAndhra Pradesh,INDIA - 521180',
        },
        {
            icon: Phone,
            title: 'Call Us',
            content: '+91 73826 16824\n+91 94914 57799',
        },
        {
            icon: Mail,
            title: 'Email Us',
            content: 'office@mictech.ac.in',
        },
        {
            icon: Clock,
            title: 'Working Hours',
            content: 'Mon - Sat: 9:00 AM - 6:00 PM\nSun: Closed',
        },
    ];

    return (
        <div className="min-h-screen bg-transparent py-20 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[var(--accent)]/10 to-transparent blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-[var(--accent)]/10 to-transparent blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-semibold mb-4">
                        <MessageSquare size={16} />
                        Get in Touch
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">Contact Us</h1>
                    <div className="w-24 h-1.5 bg-[var(--accent)] mx-auto mb-6" />
                    <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                        Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </p>
                </motion.div>

                {/* Contact Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
                >
                    {contactInfo.map((item, index) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            whileHover={{ y: -5 }}
                            className="group bg-[var(--bg-secondary)]/60 backdrop-blur-sm p-6 border border-[var(--border-color)]/30 rounded-2xl shadow-sm hover:border-[var(--accent)]/50 transition-all hover:shadow-md"
                        >
                            <div
                                className="w-14 h-14 mb-4 flex items-center justify-center rounded-xl transition-transform group-hover:scale-110 bg-[var(--accent-light)] border border-[var(--border-color)]/30"
                            >
                                <item.icon size={24} className="text-[var(--accent)]" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{item.content}</p>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="grid lg:grid-cols-5 gap-6 lg:gap-12">
                    {/* Contact Info Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2 relative"
                    >
                        <div className="bg-[var(--accent)] text-[var(--bg-primary)] p-5 sm:p-8 h-full relative overflow-hidden rounded-2xl">
                            {/* Background pattern */}
                            <div className="absolute inset-0 opacity-[0.06]">
                                <div className="absolute inset-0" style={{
                                    backgroundImage: `radial-gradient(circle at 2px 2px, var(--bg-primary) 1px, transparent 0)`,
                                    backgroundSize: '20px 20px'
                                }} />
                            </div>
                            
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-primary)]/15 backdrop-blur-sm text-sm font-medium mb-6">
                                    <Sparkles size={14} />
                                    We're here to help
                                </div>
                                
                                <h2 className="text-2xl sm:text-3xl font-bold mb-4">Let's Start a Conversation</h2>
                                <p className="text-[var(--bg-primary)]/80 mb-8 leading-relaxed">
                                    Whether you have a question about the alumni network, events, or anything else, our team is ready to answer all your questions.
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-[var(--bg-primary)]/10 backdrop-blur-sm">
                                        <div className="w-12 h-12 bg-[var(--bg-primary)]/15 flex items-center justify-center">
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-[var(--bg-primary)]/60">Email us at</p>
                                            <p className="font-semibold">office@mictech.ac.in</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 bg-[var(--bg-primary)]/10 backdrop-blur-sm">
                                        <div className="w-12 h-12 bg-[var(--bg-primary)]/15 flex items-center justify-center">
                                            <Phone size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-[var(--bg-primary)]/60">Call us at</p>
                                            <p className="font-semibold">+91 73826 16824</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.form
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        onSubmit={handleSubmit}
                        className="lg:col-span-3 bg-[var(--bg-secondary)]/60 backdrop-blur-sm p-4 sm:p-8 shadow-sm border border-[var(--border-color)]/30 rounded-2xl"
                    >
                        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Send us a Message</h3>
                        
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Your Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="John Doe"
                                    className="w-full px-4 py-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Subject</label>
                            <input
                                type="text"
                                required
                                placeholder="How can we help you?"
                                className="w-full px-4 py-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            />
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Message</label>
                            <textarea
                                rows={5}
                                required
                                placeholder="Tell us more about your inquiry..."
                                className="w-full px-4 py-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none transition-all"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            />
                        </div>
                        
                        <Button 
                            type="submit" 
                            variant="gold"
                            size="lg"
                            isLoading={isSubmitting}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            <Send size={18} /> Send Message
                        </Button>
                    </motion.form>
                </div>
            </div>
        </div>
    );
};

export default Contact;
