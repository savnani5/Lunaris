'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { 
  Home, 
  Video, 
  CreditCard, 
  Settings, 
  User,
  Menu,
  X
} from 'lucide-react';
import Image from 'next/image';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  const navItems = useMemo(() => [
    { href: '/home', label: 'Generate Videos', icon: Home },
    { href: '/clips', label: 'Clips', icon: Video },
    { href: '/buy-credits', label: 'Buy Credits', icon: CreditCard },
    { href: '/manage-subscription', label: 'Manage Subscription', icon: Settings },
    { href: '/user-profile', label: 'Manage Profile', icon: User },
  ], []);

  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-20 bg-n-8/90 backdrop-blur-sm flex items-center justify-between px-5 z-50 border-b border-n-6">
        <button onClick={toggleSidebar} className="flex items-center">
          <Image src="/assets/lunaris.svg" alt="Lunaris" width={45} height={45} />
          <span className="ml-2 text-white text-2xl font-bold">Lunaris</span>
        </button>
        <div className="flex items-center space-x-3">
          <UserButton afterSignOutUrl="/" appearance={{
            elements: {
              avatarBox: "w-8 h-8"
            }
          }} />
        </div>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      <div className={`fixed top-0 left-0 h-screen bg-n-7 text-n-1 transition-all duration-300 shadow-xl
                      md:w-64 ${isOpen ? 'w-4/5' : '-translate-x-full'} md:translate-x-0 z-50
                      ${isOpen ? 'mt-20' : ''} md:mt-0`}>
        <div className="flex flex-col h-full">
          <div className="p-6 mb-8 hidden md:block">
            <Link href="/home" className="flex items-center space-x-3">
              <img src="/assets/lunaris.svg" alt="Lunaris" className="w-10 h-10" />
              <span className="font-bold text-2xl">Lunaris</span>
            </Link>
          </div>

          <nav className="flex-grow flex flex-col justify-center md:justify-start">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} passHref>
                <div 
                  className={`flex items-center space-x-4 px-6 py-4 cursor-pointer transition-colors
                              ${pathname === item.href ? 'bg-color-1/20' : 'hover:bg-n-6'}`}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon size={24} className="text-color-1" />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>

          <div className="p-6 flex items-center justify-start space-x-3 md:block">
            <div className="hidden md:flex md:items-center md:space-x-3">
              <UserButton afterSignOutUrl="/" />
              {user && (
                <span className="text-sm truncate">
                  {user.fullName || user.username}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
