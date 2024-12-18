import React from "react";
import Section from "./Section";
import { socials } from "../constants";
import Link from "next/link";

const Footer = () => {
  return (
    <Section crosses className="!px-0 !py-10" noLines>
      <div className="container flex sm:justify-between justify-center items-center gap-10 max-sm:flex-col">
        <p className="caption text-n-4 lg:block">
          © {new Date().getFullYear()}. All rights reserved.
          {" • "}
          <Link
            href="/privacy-policy"
            className="hover:text-color-2 transition-colors"
          >
            Privacy Policy
          </Link>
        </p>
        <ul className="flex gap-5 flex-wrap">
          {/* {socials.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              className="flex items-center justify-center w-10 h-10 bg-n-7 rounded-full transition-colors hover:bg-n-6"
            >
              <img src={item.iconUrl} width={20} height={20} alt={item.title} />
            </a>
          ))} */}
        </ul>
        <p className="caption text-n-4 lg:block">
          Made with &nbsp;❤️&nbsp; in San Francisco
        </p>
      </div>
    </Section>
  );
};

export default Footer;
