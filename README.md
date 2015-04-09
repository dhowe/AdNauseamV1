[![Build Status](https://travis-ci.org/CyrusSUEN/AdNauseam.svg)](https://travis-ci.org/CyrusSUEN/AdNauseam)
<div align="center">
  <a href="http://ADNAUSEAM.io">
    <img src="https://rednoise.org/adnauseam/logo.png"/>
  </a>
</div>

[AdNauseam](http://adnauseam.io) is a lightweight browser extension that blends software tool and 'artware' intervention to protect users from tracking by advertising networks. AdNauseam works together with an 'Ad Blocker' simulating clicks on each blocked ad (in a background thread), confusing trackers as to one's real interests. Simultaneously, AdNauseam serves as a means of amplifying users' discontent with advertising networks that disregard privacy and facilitate bulk surveillance agendas.

We conceptualize AdNauseam within a broader class of software systems that serve ethical, political, and expressive ends. In light of the industry's failure to achieve consensus on a Do Not Track standard<sup>1</sup>*, or to otherwise address the excesses of network tracking,  AdNauseam allows individual users to take matters into their own hands, offering cover against certain forms of surveillance, profiling, and practices of discrimination. Taken in this light, the software represents a similar approach to that of <a href="http://cs.nyu.edu/trackmenot" target="_blank">TrackMeNot</a>, which attempts to relocate power in the hands of individual users, rather than vast commercial entities. For further information on this approach, please see <a href="http://cs.nyu.edu/trackmenot/TMN-Howe-Niss08-ch23.pdf" target="_blank">this paper</a>.

#### About the project
--------

* Web Site:         http://adnauseam.io
* Authors:          [Daniel C. Howe](http://rednoise.org/daniel), [Helen Nissenbaum](https://www.nyu.edu/projects/nissenbaum/) & [Mushon Zer-Aviv](http://mushon.com)
* License:          GPLv3 (see included [LICENSE](https://github.com/dhowe/AdNauseam/blob/master/LICENSE) file for full license)
* Github Repo:      https://github.com/dhowe/adnauseam/
* Bug Tracker:      https://github.com/dhowe/adnauseam/issues


#### Can I contribute?
--------
Absolutely! We are looking for more coders and designers to help... Just press *Fork* at the top of this github page and get started...
If you're not sure where to start, look at the issues labeled [HELP US CODE](https://github.com/dhowe/AdNauseam/labels/HELP-US-CODE). Thanks!



#### How to install the development environment

##### Developing on Firefox

1. Checkout the code with your favorite git tool, or via the command-line: 

    ```bash
    $ git checkout https://github.com/dhowe/AdNauseam.git
    ```

2. With an up-to-date version of Firefox, install and activate the [Firefox Add-On SDK](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation) as described [here](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation)

3. Create a new Firefox profile by opening the Firefox profile-manager. Note the path for the profile when you create and save it.

    ```bash
    $ /Applications/Firefox.app/Contents/MacOS/firefox-bin -P      (on OSX)
    ```
    
4. Cd into the AdNauseam folder you downloaded via git, and start Firefox with your new profile via cfx

    ```bash
    $ cd /path/to/adnauseam
    $ cfx run -p path/to/your/new-firefox-profile
    ```

5. You should now be informed that you need an ad blocker to run AdNauseam, so install [AdBlock Plus](https://addons.mozilla.org/en-US/firefox/addon/adblock-plus/) or [AdBlock Edge](https://addons.mozilla.org/en-Us/firefox/addon/adblock-edge/).

6. Quit the browser after the install, and then re-start Firefox with your profile:
    
    ```bash    
    $ cfx run -p path/to/your/new-firefox-profile
    ```

7. You can now browse the web, collecting ads in the AdNauseam menu and advault... Once you have made some changes, send us your [pull-request](https://help.github.com/articles/creating-a-pull-request/)! 
