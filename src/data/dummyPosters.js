// ─── Dummy Poster Grid Data ──────────────────
// This will be replaced by backend database data later.

const posterFiles = [
  'p0qM8hhlMF5DuxHBzl2EZR6TehX.jpg',
  '4Lok3HBSfbQxibQZBygoVCwKKrZ.jpg',
  'jsGicZboSpbkygvqdfqfbEUSFU3.jpg',
  '6o0C7Jy6TKw1Y2tmW5W2qDEsEut.jpg',
  'rRYnraF4iahVyk7bHCh99Y4p6xr.jpg',
  'bC2Mix1WPUiY6pldh77oiFl1MvI.jpg',
  'f5ZMzzCvt2IzVDxr54gHPv9jlC9.jpg',
  'n24ETnrCNuKX4O5CnQhy0lmZLYn.jpg',
  'vhlliI7HZZlWfo5d6CiyfBAGLrW.jpg',
  'yNySAgpAnWmPpYinim9E0tUzJWG.jpg',
  'opWu2Qf1g5OfAWP4HdmH4ildwuV.jpg',
  'uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg',
  '9PFonBhy4cQy7Jz20NpMygczOkv.jpg',
  '5l5uL40hrP3oKzD6zfh2F9b6XMd.jpg',
  'nBCVdo3NO2UPHO2lnrfZa0NQZfB.jpg',
  'bn2sQizEJ0qsntJRvjULsd5vk44.jpg',
  'sazCl3nmMzwpjNkePfcSm2XYmau.jpg',
  '9lxPuirAgtqHYG3JtIdfg7TucKn.jpg',
  '5CikkLfMxtKXjCDkNnzVfTwwpIL.jpg',
  'r5FjbUg5Ei9I1q48ENbo6XoFFZy.jpg',
  'qMkyyQgFZghXK8xLMq8gwQmqZS4.jpg',
  'bDR3HJIXSOgUFLxRIU4eDLEQmcz.jpg',
  'cKnhkyBrj1kMvOM8H92arUxoVqZ.jpg',
  'hPPRD5Kj96GC7NaL3dhexWfdpCU.jpg',
  'zHLtNP4KP0GMi6p1ACf2QvVnBvI.jpg',
  'lIBjLUAAw2bzeOHBJIKiZI4QDL0.jpg',
  'hKZZiiHuHFopzJwl0JYttRWEzKD.jpg',
  'm21pcuuNY58P7wkxQd3LzZSdXKU.jpg',
  '2zdhiVMVrHFu5J2LarF5bHhSabM.jpg',
  'yKEKZ0uTpKm743xsPOuhrfTBLL2.jpg',
  'nqXsAaQsKw2gKpkfhIgjXNDRqg7.jpg',
  '3AfHD1HoaQpQwKH8kxRdBKVmzeU.jpg',
  '7MzvmgHRmhbJH1UZJhRCkAtxvEy.jpg',
  'vzyfwkImcnbBhRhrS7cLjjmlzFZ.jpg',
  'vTQIqlxUkOuyf2UKhlM2OUaFGKz.jpg',
]

const titles = [
  'Mirzapur',
  'Obi-Wan Kenobi',
  'The Freelancer',
  'Lootere',
  'Murder Meri Jaan!',
  'Star Wars: Young Jedi',
  'Secret Invasion',
  'Salakaar',
  'Bajrangi Bhaijaan',
  'Uri: The Surgical Strike',
  'The Buckingham Murders',
  'Stranger Things',
  'Wednesday',
  'The Family Man',
  'Berlin',
  'Forensic',
  'Silence 2',
  'Silence',
  'Bob Biswas',
  'The Greatest of All Time',
  'Love Ni Bhavai',
  'Naadi Dosh',
  'Fodi Laishu Yaar',
  'Lagan Special',
  'Tu Jhoothi Main Makkaar',
  'Hasseen Dillruba 2',
  'Meri Pyaari Bindu',
  'Laila Majnu',
  'Behen Hogi Teri',
  'Qarib Qarib Singlle',
  'Kung Fu Panda 4',
  'Bhool Bhulaiyaa 3',
  'Jathi Ratnalu',
  'Karwaan',
  'Rocky Aur Rani',
]

const platforms = [
  'Netflix', 'Prime Video', 'Disney+ Hotstar', 'Jio Cinema',
  'Zee5', 'SonyLIV', 'Apple TV+', 'MX Player',
]

const genres = [
  'Action', 'Thriller', 'Drama', 'Comedy',
  'Romance', 'Sci-Fi', 'Horror', 'Crime',
  'Adventure', 'Mystery', 'Fantasy', 'Animation',
]

const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2025]

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export const dummyPosters = posterFiles.map((file, i) => {
  const seed = i + 42
  return {
    id: i + 1,
    title: titles[i],
    poster: `/assets/posters/${file}`,
    platform: platforms[Math.floor(seededRandom(seed) * platforms.length)],
    genre: genres[Math.floor(seededRandom(seed + 1) * genres.length)],
    year: years[Math.floor(seededRandom(seed + 2) * years.length)],
    rating: +(5 + seededRandom(seed + 3) * 4.9).toFixed(1),
    type: seededRandom(seed + 4) > 0.5 ? 'Movie' : 'TV Show',
  }
})
