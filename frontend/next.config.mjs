/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(mpwebm|mp4)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/videos/',
          outputPath: 'static/videos/',
          name: '[name].[hash].[ext]',
        },
      },
    });

    config.module.rules.push({
      test: /\.(png|jpg|jpeg|gif|svg)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next/static/images/',
            outputPath: 'static/images/',
            name: '[name].[hash].[ext]',
          },
        },
      ],
    });

    return config;
  },
  images: {
    disableStaticImages: true,
  },
};

export default nextConfig;