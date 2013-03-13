// Entry point of the chrome extension.
window.onload = function() {
  onTLPageLoaded($("body"));
};

// Loads the given url and calls the onSuccess callback with the param tlUser.
function loadPage(url, onSuccess, tlUser) {
  $.ajax({
    url: url,
    success: function(data) {
      onSuccess($(data), tlUser);
    }
  });
}

// Called when a TeamLiquid page loads. Extracts poster information and attempts 
// to search each poster on sc2ranks.
function onTLPageLoaded(html) {
  var tlUsers = getUsersFromForum(html);
  $.each(tlUsers, function() {
    var searchURL = "http://www.sc2ranks.com/search/exact/all/" + this.name;
    loadPage(searchURL, onSearchPageLoad, this);
  });
}

// Called when a sc2ranks search page loads. Depending on whether or not the search
// turned up a list of results or an exact match, parses the search page or profile page
// respectively.
function onSearchPageLoad(html, tlUser) {
  if (html[1].innerText.indexOf("Searching") == 0) // gave us search page
    parseSearchPage(html, tlUser);
  else
    parseProfilePage(html, tlUser);
}

// Extracts user information from the first page of search results. Users 
// are then ranked and the highest ranked user matching exactly the searched
// name is selected for profile parsing.
function parseSearchPage(html, tlUser) {
  var targetName = html[1].innerText.split(" ")[2];
  var users = [];
  var userHtml = $(html[31]).find(".tblrow");
  $.each(userHtml, function() {
    var user = {};
    var link = $(this).find(".character0")[0];
    user.name = link.innerText;
    user.profile = extractString(link.innerHTML);
    user.region = $(this).find(".region")[0].innerText;
    var leagueAndTier = $(this).find(".points")[0].children[0].alt;
    user.league = leagueAndTier.substr(0, leagueAndTier.indexOf("-"));
    user.tier = leagueAndTier.substr(leagueAndTier.length - 1) - 1;
    user.points = $(this).find(".number")[0].innerText;
    user.leagueIndex = getLeagueIndex(user.league);
    users.push(user);
  });
  if (users.length > 0) {
    sortUsersByRank(users);
    var bestUser = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].name == targetName) {
        bestUser = users[i];
        break;
      }
    }
    if (bestUser != null)
      loadPage("http://sc2ranks.com" + bestUser.profile, parseProfilePage, tlUser);
  }
}

// Sorts an array of users by their league and points.
function sortUsersByRank(users) {
  users.sort(function(a, b) {
    if (a.leagueIndex != b.leagueIndex)
      return b.leagueIndex - a.leagueIndex;
    else if (a.points != b.points)
      return b.points - a.points;
    else
      return 0;
  });
}

// Extracts user information from their profile. If 1v1 results are found, their post
// header on TeamLiquid is updated to show their stats.
function parseProfilePage(html, tlUser) {
  var user = {};
  var nameAndRegion = html.find(".name")[0];
  user.name = nameAndRegion.children[0].innerText;
  user.region = nameAndRegion.innerText.match(/\((.*?)\)/)[1];
  var address = extractString(html.find(".maps")[0].children[0].outerHTML);
  user.profile = address.substr(0, address.length - 6);
  user.modes = [];
  var leagueTables = html.find(".leagues");
  $.each(leagueTables, function() {
    var header = $(this).find(".headertext");
    if (header.length > 0) {
      var mode = {};
      mode.name = parseInt(header[0].innerText.charAt(0));
      var numbers = $(this).find(".number");
      var leagueAndTier = $(this).find(".badge")[1].className;
      mode.league = (leagueAndTier.split("badge-")[1]).trim();
      mode.tier = leagueAndTier.substr(leagueAndTier.length - 1) - 1;
      mode.worldRank = numbers[0].innerText;
      mode.points = numbers[1].innerText;
      mode.race = $(this).find(".character")[0].children[0].className;
      if (numbers[2] != undefined) {
        mode.divisionRank = numbers[2].innerText;
        mode.regionRank = numbers[3].innerText;
      }
      mode.wins = $(this).find(".green")[0].innerText;
      var red = $(this).find(".red");
      mode.losses = red[0] != undefined ? red[0].innerText : 0;
      user.modes.push(mode);
    }
  });
  
  addUserToDB(user);
  
  if (user.modes.length > 0 && user.modes[0].name == 1) {
    updateForumUser(user, tlUser);
  }
}

// Extracts the first instance of a quoted string from html. Used to extract urls.
function extractString(html) {
  var quotedStr = html.match(/".*?"/)[0];
  return quotedStr.substr(1, quotedStr.length - 2);
}

// Updates the post header of the given tlUser to link the profile page and show league.
function updateForumUser(user, tlUser) {
  var s = tlUser.header.innerHTML.split("&nbsp;");
  var profileLink = getProfileLink(user.name, user.profile);
  var leagueIcon = getLeagueIcon(user.modes[0].league, user.modes[0].tier);
  var raceIcon = getRaceIcon(user.modes[0].race);
  tlUser.header.innerHTML = "&nbsp;" + user.region + "&nbsp;" + s[1] + "&nbsp;" + profileLink + "&nbsp;" + leagueIcon + "&nbsp;" + raceIcon + s[3];
}

// Given a league (bronze-grandmaster) and tier (0-3), get the url to the corresponding league icon.
function getLeagueIcon(league, tier) {
  var url = getURL("images/" + league + "_" + tier + ".png");
  return "<img style='vertical-align:middle;' src='" + url + "'>";
}

// Given a race, get the corresponding icon.
function getRaceIcon(race) {
  var url = getURL("images/" + race + ".png");
  return "<img style='vertical-align:middle;' src='" + url + "'>";
}

// Fixes a relative URL for the given resource.
function getURL(url) {
  if (chrome.extension == undefined)
    return url;
  return chrome.extension.getURL(url);
}

// Builds a link tag for the given username and profile.
function getProfileLink(name, profile) {
  return "<a href='http://sc2ranks.com" + profile + "'/>" + name + "</a>";
}

// Extracts usernames and their post headers from a TeamLiquid forum thread.
function getUsersFromForum(html) {
  var users = [];
  var userHeaders = html.find(".forummsginfo");
  $.each(userHeaders, function() {
    if (this.localName == "span") {
      var user = {};
      if (this.children.length > 1) { // mods have their names contained within a span
        user.name = this.children[1].innerText;
      } else {
        user.name = this.innerText.split(" ")[0].trim();
      }
      user.header = $(this)[0];
      users.push(user);
    }
  });
  return users;
}

// Given an array of html nodes, returns the index first node which contains the given class.
function findNode(html, className) {
  for (var i = 0; i < html.length; i++) {
    var res = $(html[i]).find(className);
    if (res.length > 0)
      return i;
  }
  return -1;
}

// Gets the corresponding index to a given league name.
function getLeagueIndex(league) {
  var leagues = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"];
  return leagues.indexOf(league);
}

// Sends user information to be added to the database.
function addUserToDB(user) {
  $.ajax({
    type: "POST",
    url: "http://localhost/tlranks/add_user.php",
    data: user,
    error: function(e) {
        console.log(e.message);
    }
  });
}