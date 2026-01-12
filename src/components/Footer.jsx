import React from 'react';
import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="relative bg-white pt-24 pb-12 overflow-hidden text-gray-800 border-t border-gray-100">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full -mr-64 -mt-64 blur-3xl"></div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
                    <div className="space-y-8">
                        <img src="/src/assets/vista-logo-full.png" alt="Vista Auction" className="h-16 object-contain drop-shadow-md" />
                        <p className="text-gray-500 font-medium leading-relaxed text-sm">
                            Redefining the auction experience with technology, precision, and passion. Join us in building the future of logistics.
                        </p>
                        <div className="flex gap-4">
                            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, idx) => (
                                <a key={idx} href="#" className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-orange-600 hover:text-white transition-all shadow-sm hover:shadow-xl hover:shadow-orange-600/20 hover:-translate-y-1">
                                    <Icon size={20} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 ml-1">Quick Links</h4>
                        <ul className="space-y-5 text-sm font-bold">
                            {['Home', 'Careers', 'About Us', 'Contact'].map((item) => (
                                <li key={item}>
                                    <a href="#" className="text-gray-500 hover:text-orange-600 transition-all flex items-center gap-3 group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-600 opacity-0 group-hover:opacity-100 transition-all scale-0 group-hover:scale-100"></div>
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 ml-1">Connect</h4>
                        <ul className="space-y-6 text-sm">
                            <li className="flex items-start gap-4">
                                <div className="p-3 bg-gray-50 rounded-xl text-orange-600">
                                    <MapPin size={20} />
                                </div>
                                <span className="font-medium text-gray-500 leading-relaxed">1234 Logistics Way,<br />Charlotte, NC 28208</span>
                            </li>
                            <li className="flex items-center gap-4">
                                <div className="p-3 bg-gray-50 rounded-xl text-orange-600">
                                    <Phone size={20} />
                                </div>
                                <span className="font-bold text-gray-700">(980) 220–2564</span>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 ml-1">Newsletter</h4>
                        <p className="text-gray-500 text-sm font-medium mb-6 leading-relaxed">Stay updated with the latest roles.</p>
                        <form className="relative group">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="w-full pl-6 pr-14 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-200 outline-none transition-all placeholder:text-gray-400 placeholder:font-bold font-bold text-sm shadow-inner"
                            />
                            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95">
                                <Mail size={18} />
                            </button>
                        </form>
                    </div>
                </div>

                <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Vista Auction. All rights reserved.</p>
                    <div className="flex gap-8 mt-6 md:mt-0">
                        <a href="#" className="hover:text-orange-600 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-orange-600 transition-colors">Terms</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
