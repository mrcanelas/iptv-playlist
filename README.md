# IPTV Playlist Generator

A project to automate the creation of custom IPTV playlists (`.m3u`) by gathering and processing channel data, including metadata like logos, names, and streaming URLs.

This repository is also configured to generate and deploy playlists periodically using **GitHub Actions**.

## 🛠️ Features

- Fetches channel data and metadata from external APIs.
- Converts metadata to XML and builds a `.m3u` playlist.
- Filters and prioritizes channels based on stream quality.
- Automated updates via GitHub Actions with scheduled runs.
- Deploys the playlist to GitHub Pages.

## 📦 Requirements

- **Node.js** (minimum version 16.x)
- npm (Node Package Manager)

## 🚀 How It Works

1. **Fetching Metadata**:  
   The script `gen_channels.js` fetches metadata from a remote API, processes it, and generates an XML file (`vivoplay.com.br.channels.xml`) containing channel information.

2. **Building the Playlist**:  
   The script `gen_playlist.js` combines static channels (`.m3u`) with fetched metadata to generate a complete and structured IPTV playlist.

3. **EPG Support**:  
   An EPG (Electronic Program Guide) is generated using `epg-grabber`.

4. **Automation**:  
   A GitHub Actions workflow automates the entire process:
   - Runs every two days or when triggered manually.
   - Fetches data, builds the playlist, and deploys it to GitHub Pages.

## ⚙️ Usage

### Manual Execution

1. Clone the repository:
```bash
git clone https://github.com/mrcanelas/iptv-playlist.git
cd iptv-playlist
```
2. Install dependencies:

```bash
npm install
```
3. Run the scripts:

* Generate channel metadata:
```bash
node gen_channels.js
```
* Build the playlist:
```bash
node gen_playlist.js
```
4. The final playlist will be available in the `gh-pages/playlist.m3u` file.
   
### Automated Workflow

The GitHub Actions workflow runs automatically every two days (or can be manually triggered).
The playlist is deployed to the gh-pages branch for easy access.

## 📂 File Structure

`gen_channels.js`: Fetches channel metadata and creates an XML file.
`gen_playlist.js`: Combines static and dynamic data to create a .m3u playlist.
`workflows/auto-update.yml`: Defines the automation process with GitHub Actions.
`gh-pages/`: Contains the generated playlist and other deployment files.

## 🛡️ License

This project is licensed under the MIT License.


### ⭐ If you find this project helpful, please give it a star!
