<!doctype html>
<html>
  <head>
    <title>Scalar API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
    <style type="text/css">
      /* Custom CSS */
      
      
        .light-mode .introduction-section {
          background: url(https://nearblocks.io/images/nearblocksblack.svg) no-repeat;
          background-size: auto;
          padding-top: 60px;
          margin-top: 12px;
        }
        .dark-mode .introduction-section {
          background: url(https://nearblocks.io/images/nearblocksblack_dark.svg) no-repeat;
          background-size: auto;
          padding-top: 60px;
          margin-top: 12px;
        }
      
    </style>
  </head>
  <body>
    <div id="app"></div>
    <!-- Load the Script -->
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>

    <!-- Initialize the Scalar API Reference -->
    <script type="text/javascript">
      Scalar.createApiReference('#app', {
        "_integration": "express",
        "documentDownloadType": "none",
        "favicon": "https://nearblocks.io/favicon_32x32.png",
        "layout": "modern",
        "metaData": {
          "description": "NearBlocks REST API documentation for the NEAR Protocol. Provides endpoints to access blockchain data and integrate seamlessly with NEAR.",
          "ogDescription": "NearBlocks REST API documentation for the NEAR Protocol. Provides endpoints to access blockchain data and integrate seamlessly with NEAR.",
          "ogTitle": "Near(Ⓝ) REST API | NearBlocks",
          "title": "Near(Ⓝ) REST API | NearBlocks",
          "twitterDescription": "NearBlocks REST API documentation for the NEAR Protocol. Provides endpoints to access blockchain data and integrate seamlessly with NEAR.",
          "twitterTitle": "Near(Ⓝ) REST API | NearBlocks"
        },
        "url": "/openapi.json",
        "theme": "none",
        "customCss": "\n  .light-mode .introduction-section {\n    background: url(https://nearblocks.io/images/nearblocksblack.svg) no-repeat;\n    background-size: auto;\n    padding-top: 60px;\n    margin-top: 12px;\n  }\n  .dark-mode .introduction-section {\n    background: url(https://nearblocks.io/images/nearblocksblack_dark.svg) no-repeat;\n    background-size: auto;\n    padding-top: 60px;\n    margin-top: 12px;\n  }\n"
      })
    </script>
  </body>
</html>