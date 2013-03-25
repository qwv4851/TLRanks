# TeamLiquid Ranks

TeamLiquid Ranks is a Google Chrome extension which displays ladder information for users of the [teamliquid.net](http://teamliquid.net) forum. This is accomplished by using [sc2ranks.com](http://sc2ranks.com) to make a best guess at matching forum usernames with their [battle.net](http://battle.net) counterparts and parsing their profiles for leagues, races, and other relevant information.

## Instructions

To load the unpacked extension:
1. Open Chrome [Settings](chrome://settings) and click the [Extensions](chrome://extensions) tab.
2. Check the "Developer mode" checkbox in the top right.
3. Click the "Load unpacked extension..." button and select the folder containing the plugin.

After installing, forum users matching [sc2ranks.com](http://sc2ranks.com) profiles will have links to their profiles, regions, game versions, and league icons displayed next to their names.

## Implementation Note

TeamLiquid ranks uses a remote database to store profile information. This helps to both increase the speed of the plugin, as well as reduce the load on the [sc2ranks.com](http://sc2ranks.com) server, regardless of the number of users. A local cache is also used to prevent unnecessary database reads.