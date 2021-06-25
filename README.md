*This is a fork of original heightmap builder (JBerg60/cities-heightmap)*

# Cities: Skylines online heightmap generator
Online heightmap generator for Cities: Skylines
**Check it: https://cs.heightmap.skydark.pl**
 ---
 
 
*Original text by original author below*
## Objective
The goal is to get a accurate height map for Cities: Skylines

## Features
- height resolution 0.1 meters (cities resolution = 0.015 meters at 1:1 scale)
- easy to use interface
- takes a 18 x 18 km square from a map
- can produce png and raw images (use raw for highest accuracy)

## How to
1. Select area that you want to download

![obraz](https://user-images.githubusercontent.com/30871217/123449245-c4b9d800-d5db-11eb-966c-5424c82813bd.png)


2. Choose the options that suit you 
 
![obraz](https://user-images.githubusercontent.com/30871217/123449129-aa7ffa00-d5db-11eb-9eb5-f2395dc4f173.png)

3. If you want to download RAW file, use top download button

![obraz](https://user-images.githubusercontent.com/30871217/123448452-380f1a00-d5db-11eb-9a9d-776d61c75d67.png)

OR if you want to download PNG file, use bottom download button. Also, set grid ON / OFF in settings

![obraz](https://user-images.githubusercontent.com/30871217/123448562-5543e880-d5db-11eb-89ed-17043a40460b.png)


## Tools needed
Visual studio code or the editor of your choice.

## Info panel
By clicking the i icon, a info panel is displayed. Longitude and Latitude as well as minimum and maximum height of the square are displayed. Clicking the refresh button will update these settings.

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

## Planned enhancements
- Possible adjustment of the 18 x 18 km square for getting maps.


## Final notes
- displaying debug info is achieved by adding ```?debug=1``` to the url. A ```png``` map is added, as well as a heatmap and a rectangle of the tiles that are downloaded.
- due to the nature of mother earth (it is a cube), it is not possible to achive 100%  accuracy near the poles. However, the center square is always at the correct position.

