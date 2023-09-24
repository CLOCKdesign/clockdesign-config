# clockdesign-config
[![Deploy to FTP server](https://github.com/CLOCKdesign/clockdesign-config/actions/workflows/main.yaml/badge.svg)](https://github.com/CLOCKdesign/clockdesign-config/actions/workflows/main.yaml)
[![CodeQL](https://github.com/CLOCKdesign/clockdesign-config/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/CLOCKdesign/clockdesign-config/actions/workflows/github-code-scanning/codeql)
[![License](https://img.shields.io/github/license/CLOCKdesign/clockdesign-config?color=success)](https://img.shields.io/github/license/CLOCKdesign/clockdesign-config?color=success)

## A minimalistic webpage with WebBLE

It enables the communication between an user device and the wordclock from [CLOCKdesign](https://clockdesign.ch).
The index.html file contains a simple interface for the average user. It enables to update the time on the clock to the current localtime.

For a deeper interaction with the wordclock there is a debug interface.
It can be accessed by adding <code>?debug</code> to the end of the url.

### Technical details
- The BLE part is based on the javascript WebBLE API, as documented in [developer.mozilla](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API), [novelbits.io](https://novelbits.io/web-bluetooth-getting-started-guide/) and [developer.chrome](https://developer.chrome.com/articles/bluetooth/)
- The site is pushed to an FTP server on every git push. On the <code>dev</code> branch it is published to [dev.clockdesign.ch](https://dev.clockdesign.ch) and on the <code>main</code> branch to [config.clockdesign.ch](https://config.clockdesign.ch).
- Hiding the debug interface is done with a separate css class that is set to visible if the url ends in <code>debug</code>.
