# Voronoi Diagrams

This shader is my first attempt to produce animated Voronoi diagrams. They arise from plotting a number of "fixed points", then plotting the loci of points that are equidistant from the two nearest fixed points. Here I'm animating the results by varying some parameters with time, like the number of fixed points, the speed of rotation etc.. Voronoi diagrams result in tesselations of the plane, and have a wide range of applications ranging from fluid dynamics, the study of bone growth, forest growth patterns, rainfall measurement, aviation, video game collision detection and a host more!

## Mathematical note

Distance may be defined in terms of any valid distance metric, but generally some form of Minkowski distance, such as Euclidean distance (order 2) or Manhattan distance (order 1). Here I'm using the latter (sum of the differences of the components of the vectors). 

## Algorithm

My algorithm to draw the edges:

* Iterate through the points and find the two nearest to our pixel.
* Give our point a hue determined by i0, the index of the 
closest point.
* Then if the differences in the distances of our pixel to each of
these two points is less than some small threshold value, 
it's roughly equidistant from the two nearest points, so 
make the pixel black, as it's on the edge.
* This means regions of the plane are coloured according to their closest point, and black edges delineate the edges of these regions, or the loci of equidistance to the two nearest points.

## Note

I think there is a flaw somewhere in my algorithm or the implementation thereof, as eventually black quads appear and continue to expand.  I haven't got around to debugging this yet, though.

