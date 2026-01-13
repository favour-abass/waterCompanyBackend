module.exports = (role) => {
    return (req, res, next) => {
        if (req.user.role.toLowerCase() !== role.toLowerCase()) {
            return res.status(403).json({ error: "Access denied" });
        }
        next();
    };
};
