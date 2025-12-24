 import LeftComponent from '@/components/Left'; 
import RightComponent from '@/components/Right';

const EditorComponent = () => {
    return (
        <div className="flex w-full h-screen bg-black dark:bg-black overflow-hidden">
           {/* Left Side */}
        <div className="w-[33%] dark:bg-black overflow-hidden flex flex-col">
                <LeftComponent />
             </div>                                   
           {/* Right Side */}
           <div className="w-[67%] bg-[#171717] overflow-hidden flex flex-col">
                <RightComponent />
           </div>
        </div>
    )
}

export default EditorComponent;