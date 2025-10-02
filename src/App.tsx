import React, { useEffect, useRef, useState } from "react";
import Loader from "./Loader.tsx";
import { data } from "./data.tsx";
import "./App.css";
import DoublyLinkedList from "./utils/DoublyLinkedList";
import { searchTracks, getTrending } from "./api/audius";

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// esto es la logia del programa            ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export default function App() {
  // const [isLiked, setLiked] = useState(false);
  // const [isDisliked, setDisliked] = useState(false);
  const [isPlaying, setPlaying] = useState(false);
  const [isSuffle, setSuffle] = useState(false);
  const [isRepeat, setRepeat] = useState("repeat-off");
  const [currentPlaylist, setCurrentPlaylist] = useState(data);
  const [currentIndexSong, setCurrentIndexSong] = useState(0);
  const [currentIDsong, setCurrentIDsong] = useState(currentIndexSong + 1);
  const [currentSong, setCurrentSong] = useState(currentPlaylist[currentIndexSong]);
  const [songTotalTime, setSongTotalTime] = useState("00:00");
  const [songRestTime, setSongRestTime] = useState("00:00");
  const [songMaxTime, setSongMaxTime] = useState(0);
  const [songCurrentTime, setSongCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isVolumeDisplay, setIsVolumeDisplay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audiusQuery, setAudiusQuery] = useState("");
  const [isAudiusLoading, setIsAudiusLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<(typeof data)[number][]>([]);
  const emptySong: (typeof data)[number] = { id: "0", song: "", artist: "", src: "", cover: "" };

  // Created refs to have the current information of each object 👺

  const currentAudioRef = useRef<HTMLMediaElement>(null);
  const isMouseEnteredRef = useRef<Boolean>(false);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const dllRef = useRef<DoublyLinkedList<(typeof data)[number]> | null>(null);

  //Updates the audio information to then write it in the DOM 👺

  const setCurrentSongTotalTime = () => {
    if (currentAudioRef.current) {
      const totalMinutes = Math.floor(currentAudioRef.current.duration / 60);
      const totalSeconds = Math.floor(currentAudioRef.current.duration % 60);
      const formattedTotalTime = `${totalMinutes.toString().padStart(2, "0")}:${totalSeconds
        .toString()
        .padStart(2, "0")}`;
      setSongTotalTime(formattedTotalTime);
    }
  };

  const setCurrentSongRestTime = () => {
    if (currentAudioRef.current) {
      const rest = currentAudioRef.current.currentTime;
      const restMinutes = Math.floor(rest / 60);
      const restSeconds = Math.floor(rest % 60);
      const formattedRestTime = `${restMinutes.toString().padStart(2, "0")}:${restSeconds
        .toString()
        .padStart(2, "0")}`;
      setSongRestTime(formattedRestTime);
      setSongCurrentTime(rest);
    }
  };

  const setCurrentSongMaxTime = () => {
    if (currentAudioRef.current) {
      const maxDuration = currentAudioRef.current.duration;
      setSongMaxTime(maxDuration);
    }
  };

  const handleInputRange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (currentAudioRef?.current) {
      const audioPosition = parseFloat(event.target.value);
      currentAudioRef.current.currentTime = audioPosition;
      setSongCurrentTime(audioPosition);
      setCurrentSongRestTime();
    }
  };

  useEffect(() => {
    currentAudioRef.current?.addEventListener("loadedmetadata", setCurrentSongMaxTime);
    currentAudioRef.current?.addEventListener(
      "loadedmetadata",

      setCurrentSongTotalTime
    );
    currentAudioRef.current?.addEventListener("timeupdate", setCurrentSongRestTime);
    return () => {
      currentAudioRef.current?.removeEventListener("loadedmetadata", setCurrentSongMaxTime);
      currentAudioRef.current?.removeEventListener(
        "loadedmetadata",

        setCurrentSongTotalTime
      );
      currentAudioRef.current?.removeEventListener("timeupdate", setCurrentSongRestTime);
    };
  }, [currentAudioRef.current]);

  // Keep the doubly linked list in sync with the playlist
  useEffect(() => {
    dllRef.current = DoublyLinkedList.fromArray(currentPlaylist);
  }, [currentPlaylist]);

  // Load trending tracks from Audius (small helper, doesn't replace playlist until successful)
  const handleLoadAudiusTrending = async () => {
    setIsAudiusLoading(true);
    try {
      const tracks = await getTrending(12);
      if (tracks && tracks.length > 0) {
        // show trending in the search container (do not overwrite current playlist)
        setSearchResults(tracks as typeof data);
      }
    } catch (err) {
      console.error("Failed to load Audius trending:", err);
      // Could show a toast in the UI
    } finally {
      setIsAudiusLoading(false);
    }
  };

  const handleSearchAudius = async (q: string) => {
    if (!q || q.trim() === "") return;
    setIsAudiusLoading(true);
    try {
      const tracks = await searchTracks(q, 12);
      // show search results in the search container
      setSearchResults(tracks as typeof data);
    } catch (err) {
      console.error("Audius search failed:", err);
    } finally {
      setIsAudiusLoading(false);
    }
  };

  const addToPlaylist = (song: (typeof data)[number]) => {
    // avoid duplicates by id
    if (currentPlaylist.find((s) => s.id === song.id)) return;
    setCurrentPlaylist((prev) => [...prev, song]);
  };

  const removeFromPlaylist = (id: string | number) => {
    const idx = currentPlaylist.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const next = currentPlaylist.filter((s) => s.id !== id);
    setCurrentPlaylist(next);
    if (next.length === 0) {
      // clear player
      setCurrentIndexSong(0);
      setCurrentIDsong(0);
      setCurrentSong(emptySong);
      setPlaying(false);
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = "";
      }
      return;
    }
    // if we removed an item before the current index, shift index left
    setCurrentIndexSong((cur) => {
      if (idx < cur) return Math.max(0, cur - 1);
      if (idx === cur) return 0;
      return cur;
    });
  };

  //Updates currentSong object based on index globally👺

  useEffect(() => {
    // If playlist is empty, clear player and set fallback
    if (!currentPlaylist || currentPlaylist.length === 0) {
      setCurrentSong(emptySong);
      setCurrentIndexSong(0);
      setCurrentIDsong(0);
      setPlaying(false);
      currentAudioRef.current?.pause();
      return;
    }

    // Ensure index is in bounds
    const safeIndex = Math.min(currentIndexSong, currentPlaylist.length - 1);
    if (safeIndex !== currentIndexSong) {
      // update index and id; let the effect run again to set currentSong
      setCurrentIndexSong(safeIndex);
      setCurrentIDsong(parseFloat(currentPlaylist[safeIndex].id));
      return;
    }

    setCurrentSong(currentPlaylist[safeIndex]);
  }, [currentIndexSong, currentPlaylist]);

  //Controls autoPlay state of audio depending of repeat value 👺

  useEffect(() => {
    const handleAudioEnded = () => {
      if (isRepeat === "repeat-off") {
        if (currentIndexSong === currentPlaylist.length - 1) {
          return;
        } else {
          const updatedIndex = currentIndexSong + 1;
          setCurrentIndexSong(updatedIndex);
          setCurrentIDsong(parseFloat(currentPlaylist[updatedIndex].id));
          currentAudioRef.current?.addEventListener("canplay", () => {
            currentAudioRef.current?.play();
          });
        }
      } else if (isRepeat === "repeat-all") {
        if (currentIndexSong < currentPlaylist.length - 1) {
          const updatedIndex = currentIndexSong + 1;
          setCurrentIndexSong(updatedIndex);
          setCurrentIDsong(parseFloat(currentPlaylist[updatedIndex].id));
          currentAudioRef.current?.addEventListener("canplay", () => {
            currentAudioRef.current?.play();
          });
        } else {
          setCurrentIndexSong(0);
          setCurrentIDsong(1);
          currentAudioRef.current?.addEventListener("canplay", () => {
            currentAudioRef.current?.play();
          });
        }
      } else if (isRepeat === "repeat-1") {
        if (currentAudioRef.current) {
          currentAudioRef.current.currentTime = 0;
          currentAudioRef.current?.addEventListener("canplay", () => {
            currentAudioRef.current?.play();
          });
        }
      }
    };

    currentAudioRef.current?.addEventListener("ended", handleAudioEnded);
    return () => {
      currentAudioRef.current?.removeEventListener("ended", handleAudioEnded);
    };
  }, [isRepeat, currentPlaylist, currentAudioRef, currentIndexSong]);

  //Controls Play state of audio 👺

  useEffect(() => {
    if (isPlaying) {
      if (currentIndexSong === 0) {
        currentAudioRef.current?.play();
      } else
        currentAudioRef.current?.addEventListener("canplay", () => {
          currentAudioRef.current?.play();
        });
    } else {
      currentAudioRef.current?.pause();
      setPlaying(false);
    }
  }, [isPlaying, currentAudioRef.current?.paused]);

  //Controls scroll position depending of current index song 👺

  useEffect(() => {
    const scrollRange = 427;
    const maxElem = currentPlaylist.length - 1;
    const calSection = scrollRange / maxElem;

    const handleScroll = () => {
      const targetScrollPosition = calSection * currentIndexSong;
      scrollElementRef.current?.scrollTo(0, targetScrollPosition);
    };

    handleScroll();
  }, [currentIndexSong]);

  // Simulate an asynchronous loading process 👺
  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);

  //Controls volume of audio 👺

  useEffect(() => {
    currentAudioRef.current?.addEventListener("loadedmetadata", handleVolume);
    return () => {
      currentAudioRef.current?.removeEventListener("loadedmetadata", handleVolume);
    };
  }, [currentAudioRef.current]);

  const handlePlayClick = () => {
    if (currentAudioRef.current?.paused) {
      setPlaying(true);
      currentAudioRef.current?.play();
    } else {
      setPlaying(false);
      currentAudioRef.current?.pause();
    }
  };

  const handleBackwardClick = () => {
    if (!currentAudioRef.current || !dllRef.current) return;

    // If the current track has played more than 4s, restart it
    if (currentAudioRef.current.currentTime >= 4) {
      currentAudioRef.current.currentTime = 0;
      return;
    }

    // Try to go to previous using the doubly linked list
    const prev = dllRef.current.prevIndex(currentIndexSong);
    if (prev !== null && prev !== undefined) {
      if (currentAudioRef.current.paused) {
        setCurrentIndexSong(prev);
        setCurrentIDsong(parseFloat(currentPlaylist[prev].id));
        currentAudioRef.current?.addEventListener("canplay", () => {
          currentAudioRef.current?.play();
        });
        setPlaying(true);
      } else {
        setCurrentIndexSong(prev);
        setCurrentIDsong(parseFloat(currentPlaylist[prev].id));
      }
      return;
    }

    // If no previous and repeat-all, wrap to last
    if (isRepeat === "repeat-all") {
      const lastIndex = currentPlaylist.length - 1;
      if (currentAudioRef.current.paused) {
        setCurrentIndexSong(lastIndex);
        setCurrentIDsong(parseFloat(currentPlaylist[lastIndex].id));
        setPlaying(true);
      } else {
        setCurrentIndexSong(lastIndex);
        setCurrentIDsong(parseFloat(currentPlaylist[lastIndex].id));
      }
    }
  };

  const handleForwardClick = () => {
    if (!dllRef.current || !currentAudioRef.current) return;

    const next = dllRef.current.nextIndex(currentIndexSong);
    if (next !== null && next !== undefined) {
      if (currentAudioRef.current.paused) {
        setCurrentIndexSong(next);
        setPlaying(true);
        setCurrentIDsong(parseFloat(currentPlaylist[next].id));
      } else {
        setCurrentIndexSong(next);
        setCurrentIDsong(parseFloat(currentPlaylist[next].id));
      }
      return;
    }

    // If there is no next, handle repeat-all wrapping
    if (isRepeat === "repeat-all") {
      setCurrentIndexSong(0);
      setCurrentIDsong(parseFloat(currentPlaylist[0].id));
    }
  };

  const handleRepeatClick = () => {
    if (isRepeat === "repeat-off") {
      setRepeat("repeat-all");
    } else if (isRepeat === "repeat-all") {
      setRepeat("repeat-1");
    } else if (isRepeat === "repeat-1") {
      setRepeat("repeat-off");
    }
  };

  const handleSuffleClick = () => {
    if (!dllRef.current) return;

    if (!isSuffle) {
      const shuffledDLL = dllRef.current.shuffle(currentIndexSong);
      const randomizedPlaylist = shuffledDLL.toArray();
      setCurrentPlaylist(randomizedPlaylist);
      // dllRef will be updated by effect that watches currentPlaylist
      setCurrentIndexSong(0);
      setSuffle(true);
    } else {
      setSuffle(false);
      setCurrentPlaylist(data);
      setCurrentIndexSong(currentIDsong - 1);
    }
  };

  const handleDashboardClick = (song: (typeof currentPlaylist)[number]) => {
    setPlaying(true);
    const indexClicked = currentPlaylist.findIndex((elem) => elem.id === song.id);
    setCurrentIndexSong(indexClicked);
    setCurrentIDsong(parseFloat(song.id));
    currentAudioRef.current?.addEventListener("canplay", () => {
      currentAudioRef.current?.play();
    });
  };

  const handleVolume = (event: React.ChangeEvent<HTMLInputElement> | any) => {
    if (currentAudioRef.current) {
      const newVolume = parseFloat(event.target.value);
      if (!isNaN(newVolume) && isFinite(newVolume)) {
        currentAudioRef.current.volume = newVolume;
        setVolume(newVolume);
      }
    }
  };

  const handleMouseEnter = () => {
    isMouseEnteredRef.current = true;
    setIsVolumeDisplay(true);
  };

  const handleMouseLeave = () => {
    setIsVolumeDisplay(false);
  };

  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////


  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  // esto es parte de html - solamente el template del componente                ////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////

  return (
    <>
    
      {isLoading && <Loader />}
      <section className=" relative bg-red-800 w-screen flex flex-col gap-[10px] justify-center items-center box-border p-10 mx-auto md:gap-[20px] ml:flex-row">
        <div
          className=" h-[560px] w-[350px] bg-black text-white gap-2 flex flex-col justify-between items-center
py-[20px] px-0 rounded-[35px] drop-shadow-[0_0_10px_rgba(0,0,0,1)]
transition-all hover:scale-[1.01]
md:h-[700px] md:w-[550px] md:py-[30px] md:px-0 md:rounded-[40px]
md:drop-shadow-[0_0_10px_rgba(0,0,0,1)] md:gap-4
xl:h-[840px] xl:w-[650px] xl:hover:drop-shadow-[0_0_15px_rgba(0,0,0,1)]
">

         <div className="overflow-hidden bg-zinc-800 rounded-[35px] md:rounded-[40px] xl:rounded-[50px]
  h-[200px] w-[200px] mt-3
  md:h-[300px] md:w-[300px] md:mt-5
  xl:h-[400px] xl:w-[400px] xl:mt-7
">
  <img
    src={currentSong.cover}
    alt=""
    className="w-full h-full object-contain object-center select-none"
    draggable={false}
  />
</div>
          <div className="flex justify-center items-center flex-col w-[100%]  gap-4 mb-3 md:gap-5 md:mb-3      ">
            <div className="w-[100%]">

              <div className="flex w-[100%] ">
                <div className="w-[100%] mb-3 pl-3 md:mb-3 md:pl-5 ">
                  <h2 className="text-[30px] font-bold px-[20px]">{currentSong.song}</h2>
                  <h3 className="text-[16px] italic px-[20px]">{currentSong.artist}</h3>
                </div>
                <div className="h-[100px]">
                  {isVolumeDisplay && (
                    <div
                      className="h-[100px] w-[30px] absolute "
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolume}
                        className="rotate-[-90deg] w-[60px] h-2 accent-white absolute top-[30px] left-[-16px] "
                      ></input>
                    </div>
                  )}
                  <button
                    className="flex mt-auto mb-3 mr-3 hover:scale-105 transition-all"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    {volume === 0 ? (
                      <i className="fa-solid fa-volume-xmark hover:scale-105 text-[20px]"></i>
                    ) : (
                      <i className="fa-solid fa-volume-high hover:scale-105 text-[20px]"></i>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="w-[80%] flex flex-col justify-center items-center md:gap-2 ">
              <audio src={currentSong.src} ref={currentAudioRef} />
              <input
                type="range"
                className=" w-full h-0.5 bg-grey rounded outline-none accent-white"
                min={0}
                max={songMaxTime}
                value={songCurrentTime}
                onChange={handleInputRange}
              ></input>
              <div className="w-[100%] flex mt-[10px]">
                <span className=" text-[10px] w-[min] flex  mr-[auto] ">{songRestTime}</span>
                <span className=" text-[10px]  w-[min] flex ml-[auto] ">{songTotalTime}</span>
              </div>
            </div>
            <div className="  h-[20%] w-[100%] flex justify-center items-center gap-[40px]">
              <button onClick={handleSuffleClick}>
                <img
                  src="./shuffle-icon.png"
                  alt="suffle-icon"
                  className={
                    isSuffle
                      ? "h-[20px] object-cover invert hover:scale-105"
                      : "h-[20px] object-cover invert hover:scale-105 opacity-50"
                  }
                ></img>
              </button>
              <button onClick={handleBackwardClick}>
                <img
                  src="./backward-icon.png"
                  alt="backward-icon"
                  className={
                    isRepeat === "repeat-all"
                      ? "h-[20px] object-cover invert hover:scale-105"
                      : currentIndexSong === 0 && currentAudioRef.current?.currentTime === 0
                        ? "h-[20px] object-cover invert opacity-50 cursor-default"
                        : currentIndexSong === 0 && currentAudioRef.current?.currentTime !== 0
                          ? "h-[20px] object-cover invert hover:scale-105"
                          : "h-[20px] object-cover invert hover:scale-105"
                  }
                ></img>
              </button>
              <button onClick={handlePlayClick}>
                {currentAudioRef.current?.paused ? (
                  <img
                    src="./play-icon.png"
                    alt="play-icon"
                    className="h-[25px] object-cover invert hover:scale-105"
                  ></img>
                ) : (
                  <img
                    src="./pause-icon.png"
                    alt="pause-icon"
                    className="h-[25px] object-cover invert hover:scale-105"
                  ></img>
                )}
              </button>
              <button onClick={handleForwardClick}>
                <img
                  src="./forward-icon.png"
                  alt="forward-icon"
                  className={
                    isRepeat === "repeat-all"
                      ? "h-[20px] object-cover invert hover:scale-105"
                      : currentIndexSong === currentPlaylist.length - 1
                        ? "h-[20px] object-cover invert opacity-50 cursor-default"
                        : "h-[20px] object-cover invert hover:scale-105"
                  }
                ></img>
              </button>
              <button onClick={handleRepeatClick}>
                {isRepeat === "repeat-off" ? (
                  <img
                    src="./repeat-icon.png"
                    alt="repeat-icon"
                    className="h-[20px] object-cover invert hover:scale-105 opacity-50"
                  ></img>
                ) : isRepeat === "repeat-all" ? (
                  <img
                    src="./repeat-icon.png"
                    alt="repeat-icon"
                    className="h-[20px] object-cover invert hover:scale-105"
                  ></img>
                ) : isRepeat === "repeat-1" ? (
                  <img
                    src="./repeat-1-icon.png"
                    alt="repeat-1-icon"
                    className="h-[20px] object-cover invert hover:scale-105"
                  ></img>
                ) : (
                  <img
                    src="./repeat-icon.png"
                    alt="repeat-icon"
                    className="h-[20px] object-cover invert hover:scale-105 opacity-50"
                  ></img>
                )}
              </button>
            </div>
          </div>
        </div>
        <div
          className=" h-[560px] w-[350px] bg-black text-white gap-2 flex flex-col justify-between items-center
py-[20px] px-0 rounded-[35px] drop-shadow-[0_0_10px_rgba(0,0,0,1)]
transition-all hover:scale-[1.01]
md:h-[700px] md:w-[550px] md:py-[30px] md:px-0 md:rounded-[40px]
md:drop-shadow-[0_0_10px_rgba(0,0,0,1)] md:gap-4
xl:h-[840px] xl:w-[650px] xl:hover:drop-shadow-[0_0_15px_rgba(0,0,0,1)]
">
          <h1
            className="text-[30px] flex mr-auto items-center font-bold m-5 h-min 
          md:mb-[30px] md:mt-[30px] "
          >
            <i className="fa-solid fa-music mx-[25px] text-[34px] "></i>
            Tu Playlist
          </h1>
          <hr className="w-[90%] h-[0px] rounded  border-t-[1px] "></hr>
          <div
            ref={scrollElementRef}
            className="custom-scrollbar overflow-y-scroll items-center  flex flex-col w-[95%] mb-[20px] mt-[20px] rounded-[35px]  
            md:mb-[30px] md:mt-[30px] md:rounded-[40px] "
          >
            {currentPlaylist.map((elem) => {
              return (
                <div
                  key={elem.id}
                  onClick={() => handleDashboardClick(elem)}
                  className={
                    currentIndexSong === currentPlaylist.findIndex((song) => song.id === elem.id)
                      ? "cursor-pointer h-[70px] w-[95%] bg-zinc-600/[.5] py-[10px] px-[10px] rounded-[15px] flex flex-row  mt-[10px] justify-start items-center"
                      : "cursor-pointer h-[70px] w-[95%] hover:bg-zinc-600/[.5] bg-black/[.5] py-[10px] px-[10px] rounded-[15px] flex flex-row  mt-[10px] justify-start items-center"
                  }
                >
                  <img src={elem.cover} className="h-[50px] object-contain rounded-[10px]  "></img>
                  <div className="pl-[10px] text-[12px] font-regular  ">
                    <h3 className="text-[20px] font-semibold  ">{elem.song}</h3>
                    <h4 className="text-[12px] font-regular  ">{elem.artist}</h4>
                  </div>
                  <div
                    onClick={handlePlayClick}
                    className={
                      currentIndexSong === currentPlaylist.findIndex((song) => song.id === elem.id)
                        ? "display flex w-auto ml-auto mr-[10px]"
                        : "invisible  "
                    }
                  >
                    {currentAudioRef.current?.paused ? (
                      <img
                        src="./play-icon.png"
                        alt="play-icon"
                        className="h-[25px] object-cover invert hover:scale-105"
                      ></img>
                    ) : (
                      <img
                        src="./pause-icon.png"
                        alt="pause-icon"
                        className="h-[25px] object-cover invert hover:scale-105"
                      ></img>
                    )}
                  </div>
                  <button
                    className="px-2 py-1 rounded  group p-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromPlaylist(elem.id);
                    }}
                  >
                    <i className="fa-solid fa-circle-minus opacity-0 group-hover:opacity-100 transition-opacity duration-200"></i>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div
          className=" h-[560px] w-[350px] bg-black text-white gap-2 flex flex-col justify-between items-center
py-[20px] px-0 rounded-[35px] drop-shadow-[0_0_10px_rgba(0,0,0,1)]
transition-all hover:scale-[1.01]
md:h-[700px] md:w-[550px] md:py-[30px] md:px-0 md:rounded-[40px]
md:drop-shadow-[0_0_10px_rgba(0,0,0,1)] md:gap-4
xl:h-[840px] xl:w-[650px] xl:hover:drop-shadow-[0_0_15px_rgba(0,0,0,1)]
">

          <h2 className="text-[30px] flex mr-auto items-center font-bold m-5 h-min 
          md:mb-[30px] md:mt-[30px] ">
            <i className="fa-solid fa-search mx-[25px] text-[34px] "></i>
            ¿Que deseas escuchar?
            <button className="hover:scale-105 transition-all bg-white absolute m-3 top-0 right-0 rounded-[100%] md:m-5 "
              onClick={() => handleLoadAudiusTrending()}
              disabled={isAudiusLoading}>
              <i className="fa-solid fa-music m-3 text-[20px] text-zinc-900   md:m-4 md:text-[25px]"></i>
            </button>
          </h2>
          <div className="w-[95%] px-3 mb-1">
            <div className="flex gap-2">
              <input
                className="w-full rounded px-4 py-2 text-white bg-zinc-900 outline-none"
                placeholder="Buscar en Audius (ej. techno, artist...)"
                value={audiusQuery}
                onChange={(e) => setAudiusQuery(e.target.value)}
              />
              <button
                className="px-3 py-2 bg-black rounded"
                onClick={() => handleSearchAudius(audiusQuery)}
                disabled={isAudiusLoading}
              >
                <i className="fa-solid fa-magnifying-glass"></i>&nbsp;
              </button>

            </div>
            <div className="flex gap-2 mt-2">
            </div>
          </div>
          <div className="w-[95%] px-5 mb-3">
            <h3 className="text-white font-semibold mb-2">Resultados</h3>
            <div className="custom-scrollbar max-h-[240px] overflow-y-auto flex flex-col gap-2">
              {searchResults && searchResults.length > 0 ? (
                searchResults.map((r) => (
                  <div
                    key={`res-${r.id}`}
                    className="w-full bg-black/[.6] px-3 py-2 rounded flex items-center gap-3"
                  >
                    <img src={r.cover} className="h-[40px] object-contain rounded-[6px]" />
                    <div className="flex-1 text-[12px]">
                      <div className="font-semibold">{r.song}</div>
                      <div className="text-[12px]">{r.artist}</div>
                    </div>
                    <div>
                      <button
                        className="px-2 py-1 rounded"
                        onClick={() => addToPlaylist(r)}
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[12px] text-zinc-400">No hay resultados</div>
              )}
            </div>
          </div>
          <hr className="w-[90%] h-[0px] rounded  border-t-[1px] "></hr>
        </div>
      </section>
    </>
  );
}
