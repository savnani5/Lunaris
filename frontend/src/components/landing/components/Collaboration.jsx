import { lunarisLogo, check } from "../assets";
import { collabApps, collabContent, collabText } from "../constants";
import Button from "./Button";
import Section from "./Section";
import { LeftCurve, RightCurve } from "./design/Collaboration";
import { Gradient } from "./design/Roadmap";

const Collaboration = () => {
  return (
    <Section crosses noHorizontalLine>
      <div className="container lg:flex">
        <div className="max-w-[30rem]">
          <h2 className="h2 mb-4 md:mb-8">
            Schedule your posts and publish automatically
          </h2>

          <ul className="max-w-[22rem] mb-10 md:mb-14">
            {collabContent.map((item) => (
              <li className="mb-3 py-3" key={item.id}>
                <div className="flex items-center">
                  <img src={check} width={24} height={24} alt="check" />
                  <h6 className="body-2 ml-5">{item.title}</h6>
                </div>
                {item.text && (
                  <p className="body-2 mt-3 text-n-4">{item.text}</p>
                )}
              </li>
            ))}
          </ul>

          {/* <Button>Try it now</Button> */}
        </div>

        <div className="lg:ml-auto xl:w-[38rem] mt-4">
          <p className="body-2 mb-8 text-n-4 md:mb-16 lg:mb-32 lg:w-[22rem] lg:mx-auto">
            {collabText}
          </p>

          <div className="relative left-1/2 flex w-[22rem] aspect-square border border-n-6 rounded-full -translate-x-1/2 scale-75 md:scale-100">
            <div className="flex w-60 aspect-square m-auto border border-n-6 rounded-full">
              <div className="w-[6rem] aspect-square m-auto p-[0.2rem] bg-conic-gradient rounded-full">
                <div className="flex items-center justify-center w-full h-full bg-n-8 rounded-full">
                  <img
                    src={lunarisLogo}
                    width={48}
                    height={48}
                    alt="brainwave"
                  />
                </div>
              </div>
            </div>

            <ul>
              {collabApps.map((app, index) => {
                const angle = index * 60; // 60 degrees for 6 items
                const x = Math.cos((angle * Math.PI) / 180) * 175; // Adjust 100 to control distance from center
                const y = Math.sin((angle * Math.PI) / 180) * 175; // Adjust 100 to control distance from center

                return (
                  <li
                    key={app.id}
                    className="absolute"
                    style={{
                      top: `calc(50% + ${y}px)`,
                      left: `calc(50% + ${x}px)`,
                      transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                    }}
                  >
                    <div
                      className="flex w-[3.2rem] h-[3.2rem] bg-n-7 border border-n-1/15 rounded-xl"
                      style={{
                        transform: `rotate(-${angle}deg)`,
                      }}
                    >
                      <img
                        className="m-auto"
                        width={app.width}
                        height={app.height}
                        alt={app.title}
                        src={app.icon}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <LeftCurve />
            <RightCurve />
          </div>
        </div>
      </div>
      <Gradient />
    </Section>
  );
};

export default Collaboration;