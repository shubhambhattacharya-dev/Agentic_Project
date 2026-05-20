import{Request,Response,NextFunction} from "express";


export interface AppError extends Error{
    statusCode?:number;
}

export const errorHandler=(
    err:AppError,
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    console.error("[SERVER ERROR]:",err.stack|| err.message);
    const statusCode=err.statusCode || 500;

    return res.status(statusCode).json({
        success:false,
        error:err.message || "Internal Server Error"
    })
}