// voronoi-attempt - a fragment shader in GLSL, built on shadertoy.com;
// Author: John Lynch (@teraspora);
// Date: 04 OCT 2018.

// Attempt to draw the borders of a Voronoi diagram and animate
// them by varying various parameters with time.   I don't think it's
// precisely correct; it looks reasonable at first, then some black 
// borders expand and take over.   Need to find the bug! 

// It runs pretty slow, probably because my Heath Robinson 
// pseudorandom number generator is needlessly complex and doesn't
// even do the job properly!   Must research better algorithms
// for randomness... noise function??   Can't use iTime as I need
// the numbers to be consistent across frames.

// -----------------------------------------------------------------------------

// Copyright © 2018 John Lynch

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// -----------------------------------------------------------------------------

const float PI = 3.141592654;
const float TWO_PI = 6.283185307;
const float HALF_PI = 1.5707963267948966;

// Some useful colours:
const vec3 white =      vec3(1.,   1.,   1.  );
const vec3 black =      vec3(0.,   0.,   0.  );

// ==================================================================
// Some functions adapted from Github - 
// https://github.com/tobspr/GLSL-Color-Spaces/blob/master/ColorSpaces.inc.glsl
// - not tested!

vec3 hue2rgb(float hue)
{
    float R = abs(hue * 6. - 3.) - 1.;
    float G = 2. - abs(hue * 6. - 2.);
    float B = 2. - abs(hue * 6. - 4.);
    return clamp(vec3(R,G,B), 0., 1.);
}

// My inline library of useful functions:

// =======================================

float arg(vec2 z) {
    return atan(z.y, z.x);
}

vec2 polar(float r, float phi) {
    return vec2(r * cos(phi), r * sin(phi));
}

vec2 times(vec2 v, vec2 w) {
    return vec2(v.x * w.x - v.y * w.y, v.x * w.y + v.y * w.x);
}

vec2 rotate(vec2 v, float phi) {
    return times(v, polar(1.0, phi)) ;
}

// float dot(vec2 u, vec2 v) {
//  return u.x * v.x + u.y * v.y;
// }

float om(float x) {
    return 1. - x;
}

vec3 om(vec3 v) {
    return 1. - v;
}

float op(float x) {
    return 1. + x;
}

float nsin(float x) {
    return op(sin(x)) * 0.5;
}

float ncos(float x) {
    return op(cos(x)) * 0.5;
}

float sqrtp(float x) {
    return sqrt(x < 0. ? -x : x); 
}

float nmmod(float x, float y) {
    float xmn = 2. * mod(x, y) / y;
    return xmn < 1. ? xmn : om(xmn);
}

vec3 omss(float mn, float mx, vec3 val) {
    return om(smoothstep(mn, mx, val));
}

vec2 nmouse() {
    return iMouse.xy / iResolution.xy;
}
// =======================================

vec3 drawBorder(vec3 col, float b, vec3 insetColour, vec2 pp, vec2 hr, float tileIndex) {
    // `b` is the border width
    // `col` is the input (and output) colour
    // `pp` is (unnormalised) coordinate of pixel
    // `hr` is (unnormalised) resolution
    // Make a border: `b` px solid black; with `insetColour` inset:
    if (tileIndex != -1.) {
        //  any special code for single-pane use goes here    
    }
    // Make a line inset:
    if ((pp.x > b - 1. && pp.x <= b + 1.) || (pp.x > hr.x - b - 1. && pp.x < hr.x - b + 1.)) col = insetColour;
    if ((pp.y > b - 1. && pp.y <= b + 1.) || (pp.y > hr.y - b - 1. && pp.y < hr.y - b + 1.)) col = insetColour;
    
    // Now put a black border on top:
    col *= step(b, pp.x);
    col *= step(b, pp.y);
    col *= (1. - step(hr.x - b, pp.x));
    col *= (1. - step(hr.y - b, pp.y));
    return col;
}

vec2 psrandv2(float seed, int i) {
    vec2 a;
    a.x = cos(fract(cos(seed * 458333.003736561)) * (319.50207 + 10352.9911 * float(i)));
    a.y = sin(cos(fract(sin(seed * 1032.9908442016)) * (2786.2227 + 7046.88813 * float(i))));
    a.x *= fract(100000. * fract(dot(a, a.yx + vec2(26332.16598469, 7004.8112))));
    a.y *= fract(1000. * fract(dot(rotate(a, float(i) * 69.4177), a.yx + vec2(91104.33554432, 8112.7004))));
    return a * 0.5;
}

float minkd(vec2 u, vec2 v, float order) {  // Minkowski distance; order = 1
    if (order <= 0.) return 0.;             // => Manhattan distance
    return abs(pow(abs(pow(v.x - u.x, order)) + abs(pow(v.y - u.y, order)), 1. / order)); 
}


float qtime() {
    return mod(float(iTime), 4.) - 2.;
}
// MAIN METHOD:

vec3 doStuff(vec2 pixel, vec2 res) {
    // just takes a pixel and a context and outputs a
    // colour to mainImage, which keeps things organised
    // and encapsulated.
    
    
    // Set this var to the number of tiles across and down:
    float tileDim = 3.;
    float numTiles = tileDim * tileDim;
        
    // the output vector, before normalisation,
    // giving the position the program needs to know!-
    vec2 pp = pixel;
    vec2 hr = res / tileDim;    // resolution of one tile
    
    // ===============================================================
    
    // Normalisation and tiling:
    // ========================
    
    // Make numTiles sub-frames:
    vec2 n = vec2(float(int(pixel.x / res.x * tileDim)), float(int(pixel.y / res.y * tileDim)));
    
    float tile = numTiles -(n.y * tileDim + n.x) - 1.; 
    // start at 1 so we don't lose stuff when multiplying
    float toe = fract(tile / 2.) * 4. - 1.; // returns 1. if tile index odd, -1. if even;
    float tile2 = tile * tile;
    
    // Offset the start of each rendition:
    float time = tile * 32. + iTime;
    // shift back to the first tile if in any other tile:
    pp.x -= hr.x * n.x;
    pp.y -= hr.y * n.y;
    // normalise to [0, 1[, then shift to make unit quad with origin in centre
    vec2 q = pp / hr - 0.5;     
    // then scale:
    float scaleFactor = 1.0;
    // q /= scaleFactor;
       
    // ===============================================================================================
    // ===============================================================================================
    
    // Main code for the shader goes here:
    // ===============================================================================================
    
    // q *= 2.; 
    q = rotate(q, iTime * 0.02 + (tile - 1.) * 0.25 * PI);  // vary angle for each tile
    
    float inc = 0.003;
    vec2[4] k = vec2[](vec2(-1., -1.), vec2(-1., 1.), vec2(1., -1.), vec2(1., 1.));
    
    float order = 1.;   // minkowski order (1 = Euclidean, 2 = Manhattan)
    
    vec3 col;
    
    //Initialise points[] array:
    
    int numPoints = 4 + int(mod(iTime * 0.125, 128.));
    vec2 points[1024];
    
    float sa = 313.95920007897932 * (numTiles - tile);
    float sb = 995.2649677703343 * tile;
    float rseed = fract(cos(fract(sin(sa + cos(fract(sa) * sb)))));
    
    for (int i = 0; i < numPoints; i++) {
        points[i] = psrandv2(rseed, i) + k[int(mod(float(i), 4.))] * inc * iTime * 0.6;
        float hue = float(i) / float(numPoints - 1);
        col = hue2rgb(hue);
    }
    
    // My algorithm to draw the edges:
    // Iterate through the points and find the two nearest to q.
    // Give our point a hue determined by the i0, index of the 
    // closest point.
    // Then if the differences in the distances of q to each of
    // these two points is less than some small threshold value, 
    // it's roughly equidistant from the two nearest points, so 
    // make q black, as it's on the border.
    
    float mind0 = 1.;   // set min distances high
    float mind1 = 1.;  // 2nd smallest distance
    int i0 = 1024;
    int i1 = 1024;
    for (int i = 0; i < numPoints; i++) {   // find two closest points
        float d = minkd(q, points[i], 1.);
        if (d <= mind0) {       // new closest pt.
            mind1 = mind0;
            mind0 = d;
            i1 = i0;
            i0 = i;
        }
        else if (d <= mind1) {  // new next-closest pt.
            mind1 = d;
            i1 = i;
        }        
    }
    
    float hue = float(toe < 0. ? i0 : (numPoints - 1 - i0)) / float(numPoints - 1);
    float hueInv = 1. - hue;
    col = hue2rgb(toe > 0. ? hue : hueInv);
    col.g *= 0.4;
    col *= smoothstep(0.01, 0.02, abs(minkd(q, points[i0], order) - minkd(q, points[i1], order)));
    col = toe > 0. ? col : col.bgr;
     
    // ===============================================================================================
    // ===============================================================================================
    
    // Border code:    
    // ===============================================================================================
    
    float borderWidth = 3.;
    vec3 borderInsetLineColour = white;
    col = drawBorder(col, borderWidth, borderInsetLineColour, pp, hr, tile);
    
    // finally return the colour to caller(mainImage()):     
    return col;
}   // END doStuff()
    
// ===============================================================================

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {    
    float borderWidth = 6.;
    vec3 borderInsetLineColour = white;
    vec3 col = doStuff(fragCoord, iResolution.xy);
    col = drawBorder(col, borderWidth, borderInsetLineColour, fragCoord, iResolution.xy, -1.);
    // finally return the colour:
    fragColor = vec4(col, 1.0);        
}
