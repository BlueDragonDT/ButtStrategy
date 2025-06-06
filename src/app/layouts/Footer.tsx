import React from 'react';
import Image from 'next/image';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black w-full flex flex-row  p-4 border-t-2 border-gray-400 fixed bottom-0 left-0 z-50">
      <div className="container flex flex-row justify-center lg:justify-between items-center text-center text-white ">
        <div className="w-[200px] md:flex lg:justify-center md:items-center">
          <Image src="/StrategyB_footer.png" alt="logo" width={176} height={52} />
        </div>
        {/* <p className='opacity-50 text-xl'>© 2025 Strategy. All Rights Reserved.</p> */}
      </div>

      <div className="w-full text-lg flex flex-row justify-center gap-4 items-center ">

        <a href="https://X.com/ButtStrategy_" className="opacity-50 text-white bg-inherit hover:opacity-100 hover:underline">
          Contact Us
        </a>
        {/* <a href="#" className="opacity-50 text-white bg-inherit hover:opacity-100 hover:underline">
          Media Kit
        </a>
        <a href="#" className="opacity-50 text-white bg-inherit hover:opacity-100 hover:underline">
          Legal
        </a>
        <a href="#" className="opacity-50 text-white bg-inherit hover:opacity-100 hover:underline">
          Terms of use
        </a>

        <a href="#" className="opacity-50 text-white bg-inherit hover:opacity-100 hover:underline">
          Privacy policy
        </a> */}

      </div>
    </footer>
  );
};

export default Footer;
