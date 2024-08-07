[![CodeFactor](https://www.codefactor.io/repository/github/sysoppl/cities-skylines-heightmap-generator/badge)](https://www.codefactor.io/repository/github/sysoppl/cities-skylines-heightmap-generator)
*This is a fork of original heightmap builder (JBerg60/cities-heightmap)*
# Updated! Should work now!
# Cities: Skylines online heightmap generator
Online heightmap generator for Cities: Skylines
**Check it: https://heightmap.skydark.pl**
 ---
 

## Features
- easy to use interface
- takes a 18 x 18 km square from a map
- can produce png, raw images and zip packages

## How to
1. Select area that you want to download  
![obraz](https://user-images.githubusercontent.com/30871217/123680703-4ebaa880-d849-11eb-8b74-b254e91ef44d.png)  
Green zone shows playable tiles


2. Choose the options that suit you  
![obraz](https://user-images.githubusercontent.com/30871217/123449129-aa7ffa00-d5db-11eb-9eb5-f2395dc4f173.png)

3. To download use one of available options  
![image](https://user-images.githubusercontent.com/30871217/132255804-7cbe3e0a-f3f0-4b19-bd2f-0cf434457f09.png)


## Info panel
You can modify settings in info panel for your height map so it fits your needs.  

  ---------------------------
  
_Original text by original author below_


### Settings
- **Sea level**: the height that will be used as sea level. For land adjacent to the sea or ocean, this will usual be 0.  
For land located in mountains, this will usual be the minimum height of the square.

- **height scale**: cities uses heights up to 1024 meters. When the scale is 100%, the map is transferred 1:1 to cities. When the scale is above 100%, heights are stretched, giving mountains more accent. 

- **Below sea level**: the is the depth that can be dug in the land before hitting absolute minimum. Handy for creating lakes at sea level, or canals that are at sea level.

- **rise only land**: the sea level is kept at 0 meters, but the land gets a extra rise. This creates the possibility of creating land that is risen a small amount out of the sea. When all is raised, it creates the possibility to create a lake, when land is not adjacent to the ocean. 

### Settings examples:
- A square has a minimum height of 200 meters and a maximum height of 2200 meters (like the Alps), auto settings are calculated like this:  
Sea level is set to 200 meters, Height scale to 50%, below sea level to 5 meters and all land is raised.
By setting only land rise, and below sea level to 10, the land will raise 10 meters out of the sea. In the map editor from cities, the sea level can also be adjusted. Wen set to 9 meters, this gives a shoreline that is risen 1 meter out of the sea.

- A square has a minimum height of 0 meters and a maximum of 350 meters (like San Francisco), auto settings are calculated like this:  
Sea level is set to 0 meters, Height scale to 300%, below sea level to 20 meters and only land is raised.


## Frequently asked questions
Q: when downloading the map Chrome says ```heightmap.raw is not commonly downloaded and may be dangerous```  
A: just click on the arrow up and choose ```keep```. Height maps are not dangerous at al ;)
