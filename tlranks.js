var hostname = "76.104.218.28/tlranks";
//var hostname = "localhost/tlranks";
var dbLifespan = 604800000; // 7 days in milliseconds
var cacheLifespan = 172800000; // 2 days in milliseconds

// Entry point of the chrome extension.
window.onload = function() {
  onTLPageLoaded($("body"));
};

// Loads the given url and calls the onSuccess callback with the param tlUser.
function loadPage(url, onSuccess, tlUser) {
  $.ajax({
    url: url,
    success: function(html) {
      onSuccess($(stripRelativeSrc(html)), tlUser);
    }
  });
}

// Strips src links with relative urls from the given source.
function stripRelativeSrc(html) {
  return html.replace(/src="\/.*?"/g, "");
}

// Called when a TeamLiquid page loads. Extracts poster information and attempts 
// to search each poster on sc2ranks.
function onTLPageLoaded(html) {
  var tlUsers = getUsersFromForum(html);
  testDBExists(onDBFound, onDBNotFound);
  function onDBFound() {
    $.each(tlUsers, function() {
      if (!getUserFromLocal(this)) {
        getUserFromDB(this);
      }
    });
  }
  function onDBNotFound() {
    $.each(tlUsers, function() {
      if (!getUserFromLocal(this)) {
        searchForTLUser(this);
      }
    });
  }
}

// Checks the local storage for the given tlUser info. Returns whether or not it exists.
function getUserFromLocal(tlUser) {
  var userStr = localStorage[tlUser.name];
  if (userStr) {
    var user = JSON.parse(userStr);
    if (!isUserExpired(user, cacheLifespan)) {
      updateForumUser(user, tlUser);
      return true;
    }
  }
  return false;
}

// Checks to see if the given user information is too old.
function isUserExpired(user, lifespan) {
  if (user.date === undefined) {
    return true;
  }
  var timestamp = new Date(user.date);
  var now = new Date();
  return now - timestamp > lifespan;
}

// Creates a search request on sc2ranks for the given user.
function searchForTLUser(tlUser) {
  var searchURL = "http://www.sc2ranks.com/search/exact/all/" + simplifyName(tlUser.name);
  loadPage(searchURL, onSearchPageLoad, tlUser);
}

// Tests to see if the database is accessible.
function testDBExists(onDBFound, onDBNotFound) {
  $.ajax({
    url: "http://" + hostname + "/get_user.php",
    dataType: "json",
    success: onDBFound,
    error: onDBNotFound
  }); 
}

// Retrieves information from the database for the given user. Searches for the user if 
// not already in the database.
function getUserFromDB(tlUser) {
  $.ajax({
    url: "http://" + hostname + "/get_user.php",
    data: {name: simplifyName(tlUser.name)},
    dataType: "json",
    success: function(user) {
      if (user.profile === undefined || isUserExpired(user, dbLifespan)) {
        searchForTLUser(tlUser);
      } else if (user.modes.length > 0) {
        user.modes[0].league = getLeague(user.modes[0].leagueIndex);
        user.modes[0].race = getRace(user.modes[0].race);
        updateForumUser(user, tlUser);
      }
    },
    error: function(e) {
      console.log(e.message);
    }
  });
}

// Called when a sc2ranks search page loads. Depending on whether or not the search
// turned up a list of results or an exact match, parses the search page or profile page
// respectively.
function onSearchPageLoad(html, tlUser) {
  if (html[1].innerText.indexOf("Searching") === 0) { // gave us search page
    parseSearchPage(html, tlUser);
  }
  else {
    parseProfilePage(html, tlUser);
  }
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
      if (users[i].name === targetName) {
        bestUser = users[i];
        break;
      }
    }
    if (bestUser !== null) {
      loadPage("http://sc2ranks.com" + bestUser.profile, parseProfilePage, tlUser);
    }
    else {
      addMissingUserToDB(tlUser.name);
    }
  }
  else {
    addMissingUserToDB(tlUser.name);
  }
}

// Sorts an array of users by their league and points.
function sortUsersByRank(users) {
  users.sort(function(a, b) {
    if (a.leagueIndex !== b.leagueIndex) {
      return b.leagueIndex - a.leagueIndex;
    }
    else if (a.points !== b.points) {
      return b.points - a.points;
    }
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
      mode.name = parseInt(header[0].innerText.charAt(0), 10);
      mode.game = header[0].innerText.charAt(9);
      var numbers = $(this).find(".number");
      var leagueAndTier = $(this).find(".badge")[1].className;
      mode.league = (leagueAndTier.split("badge-")[1]).trim();
      mode.leagueIndex = getLeagueIndex(mode.league);
      mode.tier = leagueAndTier.substr(leagueAndTier.length - 1) - 1;
      mode.worldRank = numFromStr(numbers[0].innerText);
      mode.points = numFromStr(numbers[1].innerText);
      mode.race = $(this).find(".character")[0].children[0].className;
      mode.divisionRank = numbers[2] !== undefined ? numFromStr(numbers[2].innerText) : null;
      mode.regionRank = numbers[3] !== undefined ? numFromStr(numbers[3].innerText) : null;
      mode.wins = parseInt($(this).find(".green")[0].innerText, 10);
      var red = $(this).find(".red");
      mode.losses = red[0] !== undefined ? parseInt(red[0].innerText, 10) : 0;
      user.modes.push(mode);
    }
  });
  
  addUserToDB(user);
  
  if (user.modes.length > 0 && user.modes[0].name === 1) {
    updateForumUser(user, tlUser);
  }
}

function simplifyName(name) {
  return name.replace(/\W/g, "");
}

// Extracts the first number from the given string.
function numFromStr(str) {
  var matches = str.match(/\d{1,3}([,]\d{3})*$/);
  var noCommas = matches[0].replace(",", "");
  return parseInt(noCommas, 10);
}

// Extracts the first instance of a quoted string from html. Used to extract urls.
function extractString(html) {
  var quotedStr = html.match(/".*?"/)[0];
  return quotedStr.substr(1, quotedStr.length - 2);
}

// Updates the post header of the given tlUser to link the profile page and show league.
function updateForumUser(user, tlUser) {
  if (user.modes === undefined || user.modes.length === 0) {
    return;
  }
  var s = tlUser.header.innerHTML.split("&nbsp;");
  var profileLink = getProfileLink(tlUser.name, user.profile);
  var leagueIcon = getLeagueIcon(user.modes[0].league, user.modes[0].tier);
  var raceIcon = getRaceIcon(user.modes[0].race);
  tlUser.header.innerHTML = "&nbsp;" + getRegionIcon(user.region, user.modes[0].game) + "&nbsp;" + s[1] + "&nbsp;" + profileLink + "&nbsp;" + leagueIcon + raceIcon + s[3];
  addUserToLocal(tlUser.name, user);
}

// Adds the given user to the local cache
function addUserToLocal(name, user) {
  localStorage[name] = JSON.stringify(user);
}

// Given a region and game, gets the region styled with the corresponding game color.
function getRegionIcon(region, game) {
  var color;
  switch (game) {
    case 'H': color = "#C0F"; break;
    case 'W': color = "#00F"; break;
    default: color = "#000"; break;
  }
  return "<span style='color:" + color + "'>" + region + "</span>";
}

// Given a league (bronze-grandmaster) and tier (0-3), get the url to the corresponding league icon.
function getLeagueIcon(league, tier) {
  var url = getURL("images/" + league + "_" + tier + ".png");
  return "<img style='vertical-align:middle;' src='" + url + "' title='" + league + "' alt='" + league + "'>";
}

// Given a race, get the corresponding icon.
function getRaceIcon(race) {
  var url = getURL("images/" + race + ".png");
  return "<img style='vertical-align:middle;' src='" + url + "' title='" + race + "' alt='" + race + "'>";
}

// Fixes a relative URL for the given resource.
function getURL(url) {
  if (chrome === undefined || chrome.extension === undefined) {
    return url;
  }
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
    if (this.localName === "span") {
      var user = {};
      if (this.children.length > 1) { // mods have their names contained within a span
        user.name = this.children[1].innerText;
      } else {
        user.name = this.innerHTML.split("&nbsp;")[2].trim();
      }
      user.header = $(this)[0];
      users.push(user);
    }
  });
  return users;
}

var leagues = ["bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster"];
// Gets the corresponding index to a given league name.
function getLeagueIndex(league) {
  return leagues.indexOf(league.toLowerCase());
}

// Gets the corresponding league to a given index
function getLeague(index) {
  return leagues[index];
}

// Sends user information to be added to the database.
function addUserToDB(user) {
  $.ajax({
    type: "POST",
    url: "http://" + hostname + "/add_user.php",
    data: user,
    success: function(data) {
      if (data.length > 0) {
        console.log(data);
      }
    },
    error: function(e) {
      console.log(e.message);
    }
  });
}

// Creates an empty user with the given name and adds it to the database and cache
function addMissingUserToDB(name) {
  var user = {
    name: simplifyName(name),
    date: new Date().toJSON()
  };
  addUserToDB(user);
  addUserToLocal(name, user);
}

// Given a letter, gets the corresponding race
function getRace(letter) {
  switch (letter) {
    case 'z': return "zerg";
    case 't': return "terran";
    case 'p': return "protoss";
    case 'r': return "random";
  }
}