import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

const BackToTop = ({ targetId = 'main-content' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    const element = document.getElementById(targetId);
    if (element && element.scrollTop > 300) {
      setIsVisible(true);
    } else if (!element && window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const element = document.getElementById(targetId);
    const scrollElement = element || window;
    
    scrollElement.addEventListener('scroll', toggleVisibility);
    return () => {
      scrollElement.removeEventListener('scroll', toggleVisibility);
    };
  }, [targetId]);

  return (
    <>
      {isVisible && (
        <button
          className="fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-[#2ff5a8] to-[#25dd96] text-[#142019] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 md:bottom-8 md:right-8 cursor-pointer"
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp size={20} className="group-hover:scale-110 transition-transform animate-bounce-slow" />
        </button>
      )}
    </>
  );
};

export default BackToTop;
