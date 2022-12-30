# Release 2.3.0

## What's Changed
* Implemented: Updated UI of settings page(#32j3r6t) by @shashwatbangar in https://github.com/hotwax/receiving/pull/169
* Implemented functionality to let user select primary and secondary identification for product(#2y8n6qv) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/166
* Updated: version of package for minor release to 2.3.0 by @k2maan in https://github.com/hotwax/receiving/pull/170


**Full Changelog**: https://github.com/hotwax/receiving/compare/v2.2.0...v2.3.0


# Release 2.2.0

## What's Changed
* Fixed: Shipment count not being updated on the Shipments page on  adding an item from Shipment details page. (#2u59n2d) by @k2maan in https://github.com/hotwax/receiving/pull/145
* Added support to alias specific instance URL with environment configuration(#2wv2fh0) by @disha1202 in https://github.com/hotwax/receiving/pull/147
* Changed console.log to console.error #hactoberfest by @divyanshugour in https://github.com/hotwax/receiving/pull/154
* Implemented: feature to copy internal id to clipboard on the detail page for POs by @franciscoemanuel in https://github.com/hotwax/receiving/pull/157
* Fixed: Displaying toast message when no orders found on clicking Load more Purchase orders (#2vjux71) by @k2maan in https://github.com/hotwax/receiving/pull/162
* Upgraded Ionic to 6.2(#2w9wz26) by @disha1202 in https://github.com/hotwax/receiving/pull/164

## New Contributors
* @divyanshugour made their first contribution in https://github.com/hotwax/receiving/pull/154
* @franciscoemanuel made their first contribution in https://github.com/hotwax/receiving/pull/157

**Full Changelog**: https://github.com/hotwax/receiving/compare/v2.1.0...v2.2.0

# Release 2.1.0

## What's Changed
* Implemented: Upgraded app to Ionic 6.1.15 (#2ttr83t) by @k2maan in https://github.com/hotwax/receiving/pull/123 and @shashwatbangar in https://github.com/hotwax/receiving/pull/125
* Fixed: Incorrect information being displayed on PO details page(#2te5khn) by @disha1202 in https://github.com/hotwax/receiving/pull/122
* Fixed: PO details not updated after changing qty(#2te5d34) by @shashwatbangar in https://github.com/hotwax/receiving/pull/124
* Implemented: Support to store user preference for selected product store(#2f2h8hu) by @shashwatbangar in https://github.com/hotwax/receiving/pull/116
* Implemented functionality to add support to select eComStore from the settings page (#251xhvt). by @meet-aniket in https://github.com/hotwax/receiving/pull/96
* Implemented support to store user preference for selected product store (#2f2h8hu) by @rathoreprashant in https://github.com/hotwax/receiving/pull/107
* Implemented search functionality on shipments page(#2v1npkr) by @disha1202 in https://github.com/hotwax/receiving/pull/126
* Implemented: Returns flow to receive returns(#2t2wcjr) by @shashwatbangar in https://github.com/hotwax/receiving/pull/118
* Added: support to set current location from PO details, shipment details page and return page (#238pmgz)  by @adityasharma7 in https://github.com/hotwax/receiving/pull/134, @meet-aniket in https://github.com/hotwax/receiving/pull/89 and @disha1202 in https://github.com/hotwax/receiving/pull/105
* Added: support to set current location from PO details, shipment details page and return page (#238pmgz) by @disha1202 in https://github.com/hotwax/receiving/pull/128
* Fixed: code to not change the route when one of the return shipment item api fails and also change the default href for details page by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/135
* Fixed: type error on po details page by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/136
* Fixed: UI of returnDetails page(#2v7gpv1) by @shashwatbangar in https://github.com/hotwax/receiving/pull/138
* Fixed: issue of shipmentItemSeqId not being passed when receiving shipment item by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/141
* Updated query for searching PO and fixed default facility location not set on item in case PO history does not exists by @disha1202 in https://github.com/hotwax/receiving/pull/139

## New Contributors
* @k2maan made their first contribution in https://github.com/hotwax/receiving/pull/123

**Full Changelog**: https://github.com/hotwax/receiving/compare/v2.0.0...v2.1.0


# Release 2.0.0

## What's Changed
* Added IonicSDK content by @azkyakhan in https://github.com/hotwax/receiving/pull/1
* Created static UI  by @azkyakhan in https://github.com/hotwax/receiving/pull/2
* Migrated ionic vue by @azkyakhan in https://github.com/hotwax/receiving/pull/12
* Improved code of settings page functionality by @azkyakhan in https://github.com/hotwax/receiving/pull/14
* Improved css of login and shipment page (#ew2p3r) by @azkyakhan in https://github.com/hotwax/receiving/pull/13
* Improved: code to prepare loader on app mounted and assign it to null on dismiss(#1x68xu9) by @Yashi002 in https://github.com/hotwax/receiving/pull/19
* Added: example env file and added entry to ignore the env.* file from… by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/26
* Implemented shipment page functionality by @azkyakhan in https://github.com/hotwax/receiving/pull/16
* Implemented code of receiving page functionality (#1uvq022) by @azkyakhan in https://github.com/hotwax/receiving/pull/15
* Create CODE_OF_CONDUCT.md by @adityasharma7 in https://github.com/hotwax/receiving/pull/30
* Implemented code for instance URL (#1ym28pz) by @bashu22tiwari in https://github.com/hotwax/receiving/pull/31
* Fixed the position of input label on login page (#1ym3jwv) by @azkyakhan in https://github.com/hotwax/receiving/pull/32
* Added md mode (1zax3p6) by @bashu22tiwari in https://github.com/hotwax/receiving/pull/34
* Improved code by using logo component for light and dark theme on login page(#1zw59ab) by @azkyakhan in https://github.com/hotwax/receiving/pull/37
* Use Search Product API for showing product data on Shipment page (#dzkchn) by @bashu22tiwari in https://github.com/hotwax/receiving/pull/21
* Created static UI for purchaseOrderDetails page ( #1xhjpgd ). by @meet-aniket in https://github.com/hotwax/receiving/pull/23
* Added OMS information on settings page(#1y2ract) by @disha1202 in https://github.com/hotwax/receiving/pull/35
* Upgraded to Ionic 6(#1yky3xh) by @Yashi002 in https://github.com/hotwax/receiving/pull/36
* Fixed errors due to missing "=" for class and ";" for css on PurchaseOrderDetails page. by @meet-aniket in https://github.com/hotwax/receiving/pull/42
* Added GitHub action configuration to verify build and PR & issue template by @adityasharma7 in https://github.com/hotwax/receiving/pull/43
* Fixed build failure for node's version 16.13.2 ( #1yky3xh ). by @meet-aniket in https://github.com/hotwax/receiving/pull/45
* Implemented: code to clear the shipments after changing store and logout(#20d7jmt) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/46
* Updated name and favicon by @adityasharma7 in https://github.com/hotwax/receiving/pull/48
* Improved: code to add await for the getProfile action(#21v4hav) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/47
* implemented functionality to show more shipments ( #1xbznyc ) by @meet-aniket in https://github.com/hotwax/receiving/pull/20
* Improved: code to get the shipment detail on page mount(#220krj9) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/49
* Fixed: the issue of ion-input field by using the exact version 6.0.1 of ionic(#220mkyq) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/50
* Fixed: code to add the ion-menu-button on mobile devices(#220kt0h) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/51
* Implement functionality in purchase-order screen ( #1wmz45q )  by @meet-aniket in https://github.com/hotwax/receiving/pull/22
* Implemented: component for purchase-order, added service to call the … by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/18
* Implemented scanner on the shipment page #1xhmv5x by @disha1202 in https://github.com/hotwax/receiving/pull/39
* Improved code by replacing h6 with ion-note for displaying date in PO list item (#208dg0z) by @azkyakhan in https://github.com/hotwax/receiving/pull/57
* Updated code to display the date only if estimatedDeliveryDate field … by @disha1202 in https://github.com/hotwax/receiving/pull/54
* Updated the code to resolve warnings(#220ktrc) by @disha1202 in https://github.com/hotwax/receiving/pull/55
* Implemented code to fetch and show products in AddProductModal and add them in shipment when clicking on "add to shipment" ( #1wn2rqg ). by @meet-aniket in https://github.com/hotwax/receiving/pull/38
* Updated: names of components and title of receiving page(#220qzdj) by @disha1202 in https://github.com/hotwax/receiving/pull/58
* Rendered data on the PO Details page ( #1xhkf57 ). by @meet-aniket in https://github.com/hotwax/receiving/pull/56
* Implemented: use Receving app as shopify embedded app(#220uq6w) by @disha1202 in https://github.com/hotwax/receiving/pull/59
* Added: load more purchase order button(#20e32ra) by @disha1202 in https://github.com/hotwax/receiving/pull/62
* Improved: solr-query to pass the facilityId for getting POs(#226abg0) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/63
* Implemented: Add products to purchase order model(#1xhj6qe) by @disha1202 in https://github.com/hotwax/receiving/pull/60
* Implemented scanner on purchase order detail page(#1xx6hbj) by @disha1202 in https://github.com/hotwax/receiving/pull/52
* Implemented functionality for scan button PO details page ( #1xx6hbj ) by @meet-aniket in https://github.com/hotwax/receiving/pull/29
* Implemented functionality to save data loss while refreshing the browser and go back to the 'purchase-orders' page when clicking on back-button after browser refresh ( #220vbxh ). by @meet-aniket in https://github.com/hotwax/receiving/pull/64
* Improved markup and styling of purchase order detail page (#220vjzv) by @azkyakhan in https://github.com/hotwax/receiving/pull/61
* Improved styling of scan section in shipment detail page (#220quwn) by @azkyakhan in https://github.com/hotwax/receiving/pull/53
* Updated: findProduct action to use product name for searching product… by @disha1202 in https://github.com/hotwax/receiving/pull/69
* Implemented: functionality to add 'POs' from input field with the help of internalName and SKU ( #226czdd ). by @meet-aniket in https://github.com/hotwax/receiving/pull/73
* Added PWA configuration(#226cynn) by @disha1202 in https://github.com/hotwax/receiving/pull/72
* Refactored markup and styling throughout the app(#226d4t4) by @azkyakhan in https://github.com/hotwax/receiving/pull/70
* Added: orderStatusId check in the solr-query(#226d142) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/71
* Improved PWA configuration by @adityasharma7 in https://github.com/hotwax/receiving/pull/74
* Implemented logic to Update shipment with product added via add to pr… by @disha1202 in https://github.com/hotwax/receiving/pull/66
* Updated: manifest.json and added icons by @disha1202 in https://github.com/hotwax/receiving/pull/75
* Updated: payload for receive shipment function by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/76
* Implemented: code for receiving po history(#1x69a6p) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/65
* Implemented code to fetch po-history-details asynchronously in po-details page (#220t2dj). by @meet-aniket in https://github.com/hotwax/receiving/pull/68
* Improved: the route redirect path on shipment complete by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/77
* Implemented functionality for receive all button and save button in purchase order details page (#1xhmp7h). by @meet-aniket in https://github.com/hotwax/receiving/pull/27
* Fixed: the issue on progress bar on PO by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/78
* Updated manifest.json and added icons by @disha1202 in https://github.com/hotwax/receiving/pull/79
* Updated: manifest.json by @disha1202 in https://github.com/hotwax/receiving/pull/80
* Added maskable icons and updated manifest.json by @disha1202 in https://github.com/hotwax/receiving/pull/82
* Removed fullscreen=true from ion-content of all pages(#21aqct8) by @azkyakhan in https://github.com/hotwax/receiving/pull/83
* Added: viewSize in payload to fetch all product's details (#22x91py). by @meet-aniket in https://github.com/hotwax/receiving/pull/87
* Improved: addShipmentItem action when adding item from the PO page(#226h2ax) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/81
* Fixed: issue related to count of items not updating in shipment list page ( #226j5hb ). by @meet-aniket in https://github.com/hotwax/receiving/pull/84
* Added slot and updated icon in ion-button(#238uwuv) by @Nihu-Sharma in https://github.com/hotwax/receiving/pull/90
* Updated color of ion-icon in ion-chip, ion-chip outline and ion-item lines in dark mode(#238p38r) by @azkyakhan in https://github.com/hotwax/receiving/pull/91
* Added theme color in index.html file by @disha1202 in https://github.com/hotwax/receiving/pull/92
* Improved max-width, margin and tags (#24wc2vq) by @azkyakhan in https://github.com/hotwax/receiving/pull/95
* Improved: code to fix error while having spaces around fields on Login page (#20jwqu1). by @meet-aniket in https://github.com/hotwax/receiving/pull/94
* Improved code so that clicking on thumbnail of image should open it in a modal (#23301r3) by @azkyakhan in https://github.com/hotwax/receiving/pull/88
* Added: default value for property unitCost when calling receiveShipmentItem api(#226h42t) by @ymaheshwari1 in https://github.com/hotwax/receiving/pull/86
* Added firebase auto deployment configuration(#20d6xcu) by @disha1202 in https://github.com/hotwax/receiving/pull/40
* Updated App name in manifest.json and some icons name by @Mayank909 in https://github.com/hotwax/receiving/pull/93
* Improved: code to pass current orders directly to the mutation without using if else like conditions (#220vhcr). by @meet-aniket in https://github.com/hotwax/receiving/pull/100
* Updated order state mutations and actions to pass current directly to mutation(#220vhcr) by @disha1202 in https://github.com/hotwax/receiving/pull/67
* Improved: code to hide option to set baseURL if value available in '.env' file (#29wgkkh). by @Mayank909 in https://github.com/hotwax/receiving/pull/103
* Updated the code so that search works on orderId and externalOrderId(#2k5zwr1) by @disha1202 in https://github.com/hotwax/receiving/pull/110
* Fixed: Removed default base URL to allow cloud deployment by @adityasharma7 in https://github.com/hotwax/receiving/pull/111
* Fixed: Instance URL should be case insensitive(#2ft61zw) by @rathoreprashant in https://github.com/hotwax/receiving/pull/109
* Improved: code to assign input field to instance variable for searchbar (#2cj8nc4). by @meet-aniket in https://github.com/hotwax/receiving/pull/104
* Improved label to "eCom Store" on Settings page (#23tw4yf) by @rathoreprashant in https://github.com/hotwax/receiving/pull/112
* Implemented: Code to check if user has permission to access the app(#2hr41aq) by @shashwatbangar in https://github.com/hotwax/receiving/pull/115
* Used performFind API for fetching shipments(#2p75u56) by @disha1202 in https://github.com/hotwax/receiving/pull/114
* Implemented:  performFind API for fetching shipments instead of incoming-shipments API (#2p75u56) by @rathoreprashant in https://github.com/hotwax/receiving/pull/113

## New Contributors
* @azkyakhan made their first contribution in https://github.com/hotwax/receiving/pull/1
* @Yashi002 made their first contribution in https://github.com/hotwax/receiving/pull/19
* @ymaheshwari1 made their first contribution in https://github.com/hotwax/receiving/pull/26
* @bashu22tiwari made their first contribution in https://github.com/hotwax/receiving/pull/31
* @meet-aniket made their first contribution in https://github.com/hotwax/receiving/pull/23
* @disha1202 made their first contribution in https://github.com/hotwax/receiving/pull/35
* @Nihu-Sharma made their first contribution in https://github.com/hotwax/receiving/pull/90
* @Mayank909 made their first contribution in https://github.com/hotwax/receiving/pull/93
* @rathoreprashant made their first contribution in https://github.com/hotwax/receiving/pull/109
* @shashwatbangar made their first contribution in https://github.com/hotwax/receiving/pull/115

**Full Changelog**: https://github.com/hotwax/receiving/compare/v1.0.0...v2.0.0
