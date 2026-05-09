module.exports = {
  apps: [
    {
      script: "server.js",
      watch: ["server.js", "utils/", "config/", "controllers/"],
      watch_delay: 10000,
    },
  ],
};
