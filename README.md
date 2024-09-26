*This is a fork of the original heightmap builder (JBerg60/cities-heightmap)*

# Cities: Skylines Online Heightmap Generator

Generate heightmaps for Cities: Skylines with ease!  
**Check it out: [heightmap.skydark.pl](https://heightmap.skydark.pl)**

> **Note:** You must obtain your own Mapbox token to use this app.

## Features
- **User-friendly interface**
- **Resizable** map area selection
- Export options: **PNG**, **RAW images**, and **ZIP packages**

## How to Use

1. **Enter own Mapbox API token**
   Expand settings (I icon in navbar), paste your own API key, save and refresh the page

3. **Select the Area**  
   Choose the area you want to download. The green zone indicates playable tiles.  
   ![Select Area](https://user-images.githubusercontent.com/30871217/123680703-4ebaa880-d849-11eb-8b74-b254e91ef44d.png)

4. **Choose Your Options**  
   Customize the settings to fit your needs.  
   ![Choose Options](https://user-images.githubusercontent.com/30871217/123449129-aa7ffa00-d5db-11eb-9eb5-f2395dc4f173.png)

5. **Download**  
   Select one of the available download options.  
   ![Download Options](https://user-images.githubusercontent.com/30871217/132255804-7cbe3e0a-f3f0-4b19-bd2f-0cf434457f09.png)

## Info Panel
Modify settings in the info panel to tailor your heightmap.

---

_Original text by the original author below_

### Settings
- **Sea Level:** Set the height for sea level. For coastal areas, this is usually 0. For mountainous regions, use the minimum height of the area.
- **Height Scale:** Cities: Skylines supports heights up to 1024 meters. At 100%, the map is transferred 1:1. Increasing the scale accentuates mountains.
- **Below Sea Level:** Set the depth before hitting the absolute minimum. Useful for creating lakes or canals at sea level.
- **Rise Only Land:** Keeps sea level at 0 meters while raising the land. Useful for creating elevated land or lakes not adjacent to the ocean.

### Settings Examples
1. **Mountainous Area (e.g., Alps)**
   - Minimum height: 200 meters
   - Maximum height: 2200 meters
   - Auto settings: Sea level = 200m, Height scale = 50%, Below sea level = 5m, All land raised.
   - Custom: Only land rise, Below sea level = 10m. In the map editor, setting sea level to 9m gives a 1m shoreline rise.

2. **Coastal City (e.g., San Francisco)**
   - Minimum height: 0 meters
   - Maximum height: 350 meters
   - Auto settings: Sea level = 0m, Height scale = 300%, Below sea level = 20m, Only land raised.

## Frequently Asked Questions
**Q:** When downloading the map, Chrome says `heightmap.raw is not commonly downloaded and may be dangerous`.  
**A:** Click the arrow up and choose `keep`. Heightmaps are safe to download.
