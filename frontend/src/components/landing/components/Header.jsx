'use client'

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { disablePageScroll, enablePageScroll } from "scroll-lock";
import { useAuth } from "@clerk/nextjs";

import { brainwave, lunarisLogo } from "../assets";
import { navigation, authLinks } from "../constants";
import Button from "./Button";
import MenuSvg from "../assets/svg/MenuSvg";
import { HamburgerMenu } from "./design/Header";
import { useState } from "react";

const Header = () => {
  const pathname = usePathname();
  const [openNavigation, setOpenNavigation] = useState(false);

  const { isSignedIn } = useAuth();

  const toggleNavigation = () => {
    if (openNavigation) {
      setOpenNavigation(false);
      enablePageScroll();
    } else {
      setOpenNavigation(true);
      disablePageScroll();
    }
  };

  const handleClick = () => {
    if (!openNavigation) return;

    enablePageScroll();
    setOpenNavigation(false);
  };

  return (
    <div
      className={`fixed top-0 left-0 w-full z-50 border-b border-n-6 lg:bg-n-8/90 lg:backdrop-blur-sm ${
        openNavigation ? "bg-n-8" : "bg-n-8/90 backdrop-blur-sm"
      }`}
    >
      <div className="flex items-center justify-between px-5 lg:px-7.5 xl:px-10 max-lg:py-4">
        <Link className="flex items-center w-[10rem] xl:mr-8" href="/#hero">
          <Image src={lunarisLogo} width={45} height={45} alt="Lunaris" />
          <span className="ml-2 text-white text-2xl font-bold">Lunaris</span>
        </Link>

        <nav
          className={`${
            openNavigation ? "flex" : "hidden"
          } fixed top-[5rem] left-0 right-0 bottom-0 bg-n-8 lg:static lg:flex lg:mx-auto lg:bg-transparent`}
        >
          <div className="relative z-2 flex flex-col items-center justify-center m-auto lg:flex-row">
            {navigation.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                onClick={handleClick}
                className={`block relative font-code text-2xl uppercase text-n-1 transition-colors hover:text-color-1 px-6 py-6 md:py-8 lg:-mr-0.25 lg:text-sm lg:font-semibold ${
                  item.url === pathname
                    ? "z-2 lg:text-n-1"
                    : "lg:text-n-1/50"
                } lg:leading-5 lg:hover:text-n-1 xl:px-12`}
              >
                {item.title}
              </Link>
            ))}
            
            {/* Mobile auth links */}
            <div className="lg:hidden">
              {isSignedIn ? (
                <Link
                  href="/home"
                  onClick={handleClick}
                  className="block relative font-code text-2xl uppercase text-n-1 transition-colors hover:text-color-1 px-6 py-6 md:py-8"
                >
                  My Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    onClick={handleClick}
                    className="block relative font-code text-2xl uppercase text-n-1 transition-colors hover:text-color-1 px-6 py-6 md:py-8"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={handleClick}
                    className="block relative font-code text-2xl uppercase text-n-1 transition-colors hover:text-color-1 px-6 py-6 md:py-8"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          <HamburgerMenu />
        </nav>

        <div className="flex items-center">
          {isSignedIn ? (
            <Link href="/home" className="hidden lg:block mr-4 text-n-1/50 hover:text-n-1 transition-colors text-base">
              My Dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="hidden lg:block mr-4 text-n-1/50 hover:text-n-1 transition-colors text-base">
                Sign In
              </Link>
              <Link href="/sign-up" target="_blank" passHref>
                <Button className="hidden lg:flex">
                  Sign Up
                </Button>
              </Link>
            </>
          )}

          <Button
            className="ml-auto lg:hidden"
            px="px-3"
            onClick={toggleNavigation}
          >
            <MenuSvg openNavigation={openNavigation} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Header;
