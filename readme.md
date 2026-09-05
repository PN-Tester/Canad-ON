# Enforce Canadian Map Terminology

This chromium extension will enforce the Canada region for all google maps API requests. This will cause google maps embedded in web applications to render with the Canadian terminology for map elements.
The tool is simple, and works by intercepting XHR / Async requests to https://maps.googleapis.com and setting any "region" URL parameter to "CA".

# Demo - Canad/ON
![](https://github.com/PN-Tester/Canad-ON/blob/main/canadon-demo.png)
# Demo - Canad/OFF
![](https://github.com/PN-Tester/Canad-ON/blob/main/canadoff-demo.PNG)
