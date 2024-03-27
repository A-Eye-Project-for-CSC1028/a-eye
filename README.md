# A-Eye Web Tool

_Empowering low-poly 3D models with multi-purpose functionality._

## Overview

Constructs the foundation of the A-Eye image generation pipeline - renders depth maps for any .obj file, allowing them to be used in the creation of advanced AI imagery via the [a-eye-generator script(s)](https://github.com/A-Eye-Project-for-CSC1028/a-eye-generator).

Built using [Vite](https://vitejs.dev/) & [Three.js](https://threejs.org/).

## Key Features

- **View 3D Models (.obj) In Any Modern Browser:** Upload your own `.obj` files and view them in any modern web browser across multiple platforms - be it Chrome, Safari, or otherwise!
- **Depth Map Projection:** Easily obtain an accurate depth map for any 3D model (`.obj`).
- **Preloaded 3D Models:** Choose from a small selection of free 3D objects from [poly.pizza](https://poly.pizza).
- **Camera Malleability:** Position the camera in any way you wish, far or close!
- **Export Screen-Space & World-Space Data (JSON):** Intended to facilitate object recognition systems' development, but could also prove useful in other ways.

## How can I access the tool?

There are two ways you can access a-eye:

1. Via the [hosted (online)](https://a-eye-vision.tech) instance.
2. Via a [self-hosted (local)](#getting-started---self-hosted) instance.

## Getting Started - Self-Hosted

### Prerequisites

- [Node.js v18+](https://nodejs.org/en/download): Earlier versions _may_ work - however, they are not expressly supported.
- [PnPm 8.x+](https://pnpm.io/installation): Earlier versions are not easily available, and so I have not tested them.

### Installation

- Firstly, clone this repository to your machine with:

```
git clone https://github.com/A-Eye-Project-for-CSC1028/a-eye.git
```

- Then, run the following command in the root of the cloned folder - this installs the required dependencies:

```
pnpm i
```

- Finally, run:

```
pnpm run dev
```

...and that's it! To use a-eye, visit [http://localhost:5173](http://localhost:5173) from your favourite web browser.

## Contributing

Contributions are most welcome! Please see below for more details:

- Open issues for bug reports or feature requests.
- Submit pull requests with code enhancements or new features.

## License

This project is licensed under the [MIT license](https://github.com/A-Eye-Project-for-CSC1028/a-eye-generator/blob/master/LICENSE) - please see the linked document for more information.

## Attributions

- Chair by Poly by Google [CC-BY] (https://creativecommons.org/licenses/by/3.0/) via Poly Pizza (https://poly.pizza/m/13AL0KYItKD)
- Coffee Table by Kenney (https://poly.pizza/m/y4ZU5S7RuD)
- Couch by CMHT Oculus [CC-BY] (https://creativecommons.org/licenses/by/3.0/) via Poly Pizza (https://poly.pizza/m/cZltkfbEKS8)
