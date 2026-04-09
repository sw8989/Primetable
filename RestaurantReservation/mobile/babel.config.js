module.exports = function (api) {
  const isTest = api.env('test');
  api.cache(() => isTest);
  return {
    presets: [
      [
        "babel-preset-expo",
        isTest
          ? { worklets: false }
          : { jsxImportSource: "nativewind", worklets: false },
      ],
      ...(isTest ? [] : ["nativewind/babel"]),
    ],
  };
};
