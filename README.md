# Cities: Skyline height map generator
A accurate heightmap generator for Cities: Skylines.  
Application: https://cities.heightmap.space

## Objective
The goal is to get a accurate height map for Cities: Skyline. 

## Current features
- Height resolution 0.1 meters (cities resolution = 0.015 meters at 1:1 scale).  
- Easy to use interface.  
- takes a 18 x 18 km square from a map.
- Can produce png and raw images. Use **raw** for highest accuracy.

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



## Planned enhancements
- Possible adjustment of the 18 x 18 km square for getting maps.


## final notes
