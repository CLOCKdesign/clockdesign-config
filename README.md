# clockdesign-config
[![Deploy to FTP server](https://github.com/CLOCKdesign/clockdesign-config/actions/workflows/main.yaml/badge.svg)](https://github.com/CLOCKdesign/clockdesign-config/actions/workflows/main.yaml)

A minimalistic webpage with WebBLE

The root index.html contains a simple interface for the enduser.
Enter the debug mode by adding <code>?debug</code> to the end of the url.

### Technical details
- The BLE part is based on the javascript WebBLE API, as documented in [developer.mozilla](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API), [novelbits.io](https://novelbits.io/web-bluetooth-getting-started-guide/) and [developer.chrome](https://developer.chrome.com/articles/bluetooth/)
- The site gets pushed to my FTP server on every git push. On the <code>dev</code> branch it is published to [dev.clockdesign.ch](https://dev.clockdesign.ch) and on the <code>main</code> branch to [config.clockdesign.ch](https://config.clockdesign.ch).
