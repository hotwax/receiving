# Receiving app changelog
The latest version of this file can be found at the master branch of the
receiving repository.

## 1.0.0 (2020-09-01)

### Implemented
- [3hn0dw](https://app.clickup.com/t/3hn0dw) Implemented initial codebase for receiving app !1
- [3hq75f](https://app.clickup.com/t/3hq75f) Implemented UI on home page as per the design mockup with dummy data !2
- [#3nk6f9](https://app.clickup.com/t/#3nk6f9) Implemented UI of shipment details page as per the design mockup !4
- [3nnrh3](https://app.clickup.com/t/3nnrh3) Implemented image component to display the image in all over the app !5
- [3nnrnf](https://app.clickup.com/t/3nnrnf) Implemented UI of addProduct modal as per the design mockup !6
- [3nnym4](https://app.clickup.com/t/3nnym4) Implemented auth guard service for authentication !7
- [3ntch0](https://app.clickup.com/t/3ntch0) Implemented login component and provider for storage, widget and authentication !8
- [13amwb](https://app.clickup.com/t/13amwb) Implemented settings component to list the associated facilities in dropdown also implemented logout functionality !9
- [13cf5w](https://app.clickup.com/t/13cf5w) Integrate incoming-shipments API to display the shipment list on home page, also added empty state image for no-shipments !11
- [1569hx](https://app.clickup.com/t/1569hx) Integrated shipment-detail API on shipment component !12
- [157k3y](https://app.clickup.com/t/157k3y) Integrated receiveShipmentItem API that will be invoke on tapping the fab button !13
- [157a3x](https://app.clickup.com/t/157a3x) Integrated addShipmentItem API that will be invoke from addProduct modal !15
- [157a0u](https://app.clickup.com/t/157a0u) Integrated products API to scan the product with SKU on shipment page !16
- [15dw78](https://app.clickup.com/t/15dw78) Integrated updateShipment API and improved the invocation of incoming-shipments API !17
- [176mun](https://app.clickup.com/t/176mun) Added configuration to create debian package of the app !19
- [196ckg](https://app.clickup.com/t/196ckg) Implemented functionality to open the addProduct modal by capturing CTRL+o command !23
- [197ejh](https://app.clickup.com/t/197ejh) Implemented functionality to search the shipment using shipmentId, also handle the UI on home and shipment page as per the shipment status !24

### Improved
- [13cg8d](https://app.clickup.com/t/13cg8d) Improved UI of shipment page and addProduct modal as discussed with Aditya P !10
- [17d3x1](https://app.clickup.com/t/17d3x1) Improved width of content in all over the app using max-width and margin properties !20
- [17d3yx](https://app.clickup.com/t/17d3yx) Improved shipment page by displaying the barcode button for each platform except desktop !21
- [158peh](https://app.clickup.com/t/158peh) Improved UI label for confirmQuantity by adding the period in the message !22

### Fixed
- [158pe5](https://app.clickup.com/t/158pe5) Fixed an issue where acceptedQuantity is not updated on tapping receiveAll button after editing the quantity !14
- [17bfmd](https://app.clickup.com/t/17bfmd) Fixed an issue where scanning product not working properly !18
- [199yc1](https://app.clickup.com/t/199yc1) Fixed an issue where addProduct modal opens on home page using CTRL+o command, invoked removeEventListener method in ionViewDidLeave event !26
